"""Build and verify a signed AAB. Secrets are read only from the environment."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
STORE = Path(os.environ['NEON_KEYSTORE_PATH']).resolve()
CANDIDATES = json.loads(os.environ['NEON_PASSWORD_CANDIDATES'])
ENV = os.environ.copy()
ENV.pop('NEON_PASSWORD_CANDIDATES', None)
for index, password in enumerate(CANDIDATES):
    ENV[f'NEON_PASS_{index}'] = password

with tempfile.TemporaryDirectory(prefix='neon-sign-') as temporary:
    probe = Path(temporary) / 'CheckStore.java'
    probe.write_text('''import java.io.File; import java.security.*; import java.util.*;
class CheckStore { public static void main(String[] args) throws Exception {
 for(int i=0;i<Integer.parseInt(args[1]);i++) { try {
  KeyStore store=KeyStore.getInstance(new File(args[0]),System.getenv("NEON_PASS_"+i).toCharArray());
  for(String alias: Collections.list(store.aliases())) { if(!store.isKeyEntry(alias)) continue;
   for(int j=0;j<Integer.parseInt(args[1]);j++) { try {
    if(store.getKey(alias,System.getenv("NEON_PASS_"+j).toCharArray())!=null) {
     String fingerprint=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(store.getCertificate(alias).getEncoded()));
     String sha1=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(store.getCertificate(alias).getEncoded()));
     String expected=System.getenv("NEON_EXPECTED_SHA1");
     if(expected!=null && !sha1.equalsIgnoreCase(expected.replace(":", ""))) continue;
     System.out.println(i+"|"+j+"|"+alias+"|"+System.getProperty("java.home")+"|"+fingerprint+"|"+sha1); return;
    }
   } catch(Exception ignored) {} }
  }
 } catch(Exception ignored) {} }
 System.exit(2);
}}''', encoding='utf-8')
    check = subprocess.run(['java', '-Xmx128m', str(probe), str(STORE), str(len(CANDIDATES))], env=ENV, capture_output=True, text=True)
    if check.returncode:
        raise SystemExit('No private key matching the supplied password options and expected certificate was found.')
    store_index, key_index, alias, java_home, fingerprint, sha1 = check.stdout.strip().split('|')
    ENV['NEON_STORE_PASSWORD'] = CANDIDATES[int(store_index)]
    ENV['NEON_KEY_PASSWORD'] = CANDIDATES[int(key_index)]
    ENV['NEON_KEY_ALIAS'] = alias
    ENV['NEON_KEYSTORE_PATH'] = str(STORE)
    for index in range(len(CANDIDATES)):
        ENV.pop(f'NEON_PASS_{index}', None)
    print('Keystore and private key verified. Alias: ' + alias, flush=True)
    print('Certificate SHA1: ' + ':'.join(sha1[i:i+2].upper() for i in range(0, len(sha1), 2)), flush=True)

    logs = ROOT / 'artifacts'
    logs.mkdir(exist_ok=True)
    signer = str(Path(java_home) / 'bin/jarsigner.exe')
    source = os.environ.get('NEON_RESIGN_SOURCE')
    if source:
        subprocess.run([sys.executable, str(ROOT / 'scripts/verify-release.py'), source], check=True)
        bundle = Path(temporary) / 'app-release.aab'
        # Remove only the previous JAR signature; preserve every bundle payload byte.
        with ZipFile(source) as original, ZipFile(bundle, 'w') as unsigned:
            for entry in original.infolist():
                upper = entry.filename.upper()
                signature = upper == 'META-INF/MANIFEST.MF' or (upper.startswith('META-INF/') and upper.endswith(('.SF', '.RSA', '.DSA', '.EC')))
                if not signature:
                    unsigned.writestr(entry, original.read(entry.filename))
        signed = subprocess.run([signer, '-J-Xmx128m', '-keystore', str(STORE), '-storepass:env', 'NEON_STORE_PASSWORD',
                                 '-keypass:env', 'NEON_KEY_PASSWORD', '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256',
                                 str(bundle), alias], env=ENV, capture_output=True, text=True)
        if signed.returncode:
            raise SystemExit('Re-signing failed: ' + signed.stdout + signed.stderr)
        with ZipFile(source) as original, ZipFile(bundle) as signed_zip:
            for entry in original.infolist():
                if not entry.filename.upper().startswith('META-INF/'):
                    assert signed_zip.read(entry.filename) == original.read(entry.filename), 'Bundle payload changed'
        print('Existing bundle re-signed; game payload is unchanged.', flush=True)
    else:
        log = logs / 'bundle-release.log'
        with log.open('w', encoding='utf-8') as output:
            build = subprocess.run([str(ROOT / 'android/gradlew.bat'), ':app:bundleRelease', '--no-daemon', '--console=plain'],
                                   cwd=ROOT / 'android', env=ENV, stdout=output, stderr=subprocess.STDOUT)
        print('\n'.join(log.read_text(encoding='utf-8', errors='replace').splitlines()[-24:]), flush=True)
        if build.returncode:
            raise SystemExit('Release build failed. See artifacts/bundle-release.log.')
        bundle = ROOT / 'android/app/build/outputs/bundle/release/app-release.aab'
    verification = subprocess.run([signer, '-J-Xmx128m', '-verify', '-verbose', '-certs', str(bundle)],
                                  capture_output=True, text=True)
    (logs / 'bundle-signature.txt').write_text(verification.stdout + verification.stderr, encoding='utf-8')
    if verification.returncode or 'jar verified' not in verification.stdout:
        raise SystemExit('AAB signature verification failed.')
    verify = Path(temporary) / 'VerifyBundle.java'
    verify.write_text('''import java.util.jar.*; import java.security.*; import java.util.*;
class VerifyBundle { public static void main(String[] args) throws Exception {
 try(JarFile jar=new JarFile(args[0],true)) {
  int signed=0;
  for(JarEntry entry: Collections.list(jar.entries())) {
   if(entry.isDirectory() || entry.getName().startsWith("META-INF/")) continue;
   try(var input=jar.getInputStream(entry)) { input.transferTo(java.io.OutputStream.nullOutputStream()); }
   var signers=entry.getCodeSigners();
   if(signers==null) throw new Exception("Unsigned entry: "+entry.getName());
   var cert=signers[0].getSignerCertPath().getCertificates().get(0);
   String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(cert.getEncoded()));
   if(!hash.equals(args[1])) throw new Exception("Wrong signing certificate");
   signed++;
  }
  System.out.println("Verified "+signed+" signed entries with the supplied keystore certificate.");
 }
}}''', encoding='utf-8')
    match = subprocess.run(['java', '-Xmx128m', str(verify), str(bundle), fingerprint], capture_output=True, text=True)
    if match.returncode:
        raise SystemExit('Bundle certificate/content verification failed: ' + match.stderr)
    print(match.stdout.strip(), flush=True)
    subprocess.run([sys.executable, str(ROOT / 'scripts/verify-release.py'), str(bundle)], check=True)

    # Read the version from the configured Android app, instead of hardcoding a filename.
    import re
    gradle = (ROOT / 'android/app/build.gradle').read_text(encoding='utf-8')
    version = re.search(r'versionName "([^"]+)"', gradle).group(1)
    code = re.search(r'versionCode (\d+)', gradle).group(1)
    output = ROOT / f'release/neonblast-{version}-v{code}.aab'
    output.parent.mkdir(exist_ok=True)
    shutil.copy2(bundle, output)
    mapping = ROOT / 'android/app/build/outputs/mapping/release/mapping.txt'
    if mapping.exists():
        shutil.copy2(mapping, output.parent / f'mapping-{version}-v{code}.txt')
    print('Signed AAB verified: ' + str(output), flush=True)
    print('Size: ' + str(output.stat().st_size) + ' bytes', flush=True)
