const FECHA_BODA = '2026-10-17';

function fechaHoyChile() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

function esDiaDeBoda() {
    return fechaHoyChile() === FECHA_BODA;
}
