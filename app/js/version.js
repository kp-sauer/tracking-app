// Zentrale App-Version — EINE Quelle für UI und Service Worker.
// Beim Deploy nur diese Zahl hochzählen.
// KEIN export-Statement: so kann der klassische SW die Datei per importScripts laden
// (export würde dort "Unexpected token export" werfen). Das UI importiert die Datei als
// ES-Modul für den Seiteneffekt und liest danach globalThis.APP_VERSION.
globalThis.APP_VERSION = '67';
