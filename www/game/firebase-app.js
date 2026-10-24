// Shared app: leaderboard and Remote Config remain independent consumers.
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';

export const firebaseConfig = {
    apiKey: 'AIzaSyCNqCeXDbc04vuqj8VX0i34NebvcClqUes',
    authDomain: 'neon-blast-8a945.firebaseapp.com',
    databaseURL: 'https://neon-blast-8a945-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'neon-blast-8a945',
    storageBucket: 'neon-blast-8a945.firebasestorage.app',
    messagingSenderId: '313551328820',
    appId: '1:313551328820:web:d565525e8b0d5ae26e1c61',
    measurementId: 'G-YCGD0Z8GDM'
};
export const app = getApps().find(app => app.name === '[DEFAULT]') || initializeApp(firebaseConfig);
