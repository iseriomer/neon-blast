"""Check the actual AAB manifest, build version, and packaged game files."""
from pathlib import Path
import re
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent


def fields(data):
    position = 0

    def varint():
        nonlocal position
        number = shift = 0
        while True:
            byte = data[position]
            position += 1
            number |= (byte & 127) << shift
            if byte < 128:
                return number
            shift += 7

    while position < len(data):
        key = varint()
        wire = key & 7
        if wire == 2:
            length = varint()
            value = data[position:position + length]
            position += length
        elif wire == 0:
            value = varint()
        elif wire in (1, 5):
            length = 8 if wire == 1 else 4
            value = data[position:position + length]
            position += length
        else:
            raise ValueError(f'Unsupported protobuf wire type: {wire}')
        yield key >> 3, value


def verify(bundle):
    app = (ROOT / 'android/app/build.gradle').read_text(encoding='utf-8')
    build = (ROOT / 'android/build.gradle').read_text(encoding='utf-8')
    variables = (ROOT / 'android/variables.gradle').read_text(encoding='utf-8')
    expected_min_sdk = re.search(r'minSdkVersion\s*=\s*(\d+)', variables).group(1)
    expected = {
        'package': re.search(r'applicationId "([^"]+)"', app).group(1),
        'versionCode': re.search(r'versionCode (\d+)', app).group(1),
        'versionName': re.search(r'versionName "([^"]+)"', app).group(1),
    }
    agp = re.search(r'com.android.tools.build:gradle:([^\']+)', build).group(1)
    with ZipFile(bundle) as archive:
        assert archive.testzip() is None, 'Corrupt AAB archive'
        element = next(value for field, value in fields(archive.read('base/manifest/AndroidManifest.xml')) if field == 1)
        attributes = {}
        for field, value in fields(element):
            if field == 4:
                attribute = dict(fields(value))
                attributes[attribute[2].decode()] = attribute.get(3, b'').decode()
        for name, value in expected.items():
            assert attributes[name] == value, f'Wrong {name}: {attributes[name]}'
        sdk_attributes = {}
        for field, value in fields(element):
            if field != 5:
                continue
            child = next((item for number, item in fields(value) if number == 1), None)
            if child is None or dict(fields(child)).get(3) != b'uses-sdk':
                continue
            for number, item in fields(child):
                if number == 4:
                    attribute = dict(fields(item))
                    sdk_attributes[attribute[2].decode()] = attribute.get(3, b'').decode()
        assert sdk_attributes.get('minSdkVersion') == expected_min_sdk, f'Wrong minSdkVersion: {sdk_attributes}'
        metadata = next(name for name in archive.namelist() if name.endswith('app-metadata.properties'))
        assert f'androidGradlePluginVersion={agp}' in archive.read(metadata).decode(), 'Stale Android build toolchain'
        assets = 0
        for source in (ROOT / 'www').rglob('*'):
            if not source.is_file():
                continue
            name = 'base/assets/public/' + source.relative_to(ROOT / 'www').as_posix()
            assert archive.read(name) == source.read_bytes(), f'Stale game asset: {name}'
            assets += 1
        assert 'BundleConfig.pb' in archive.namelist()
        assert 'base/dex/classes.dex' in archive.namelist()
    print(f"Verified {expected['package']} {expected['versionName']} (code {expected['versionCode']}), minSdk {expected_min_sdk}, AGP {agp}, {assets} current game assets.")


if __name__ == '__main__':
    verify(Path(sys.argv[1]))
