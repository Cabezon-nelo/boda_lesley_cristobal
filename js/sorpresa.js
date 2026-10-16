(function () {
    const forzar = new URLSearchParams(location.search).has('sorpresa');
    if (!forzar && !esDiaDeBoda()) return;

    const clave = 'sorpresa-' + FECHA_BODA;
    try {
        if (!forzar && localStorage.getItem(clave)) return;
        localStorage.setItem(clave, '1');
    } catch (e) {}

    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colores = ['#fffaf0', '#f6dfe0', '#f1c9cf', '#e9cf8a', '#d9b25c'];

    const capa = document.createElement('div');
    capa.className = 'sorpresa';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', 'Hoy es el gran día');

    const lienzo = document.createElement('canvas');
    const contenido = document.createElement('div');
    contenido.className = 'sorpresa-contenido';

    const fecha = document.createElement('div');
    fecha.className = 'sorpresa-fecha';
    fecha.textContent = '17 . Octubre . 2026';
    const mensaje = document.createElement('div');
    mensaje.className = 'sorpresa-mensaje';
    mensaje.textContent = '¡Hoy nos casamos!';
    const nombres = document.createElement('div');
    nombres.className = 'sorpresa-nombres';
    nombres.textContent = 'Lesley y Cristóbal';
    contenido.append(fecha, mensaje, nombres);

    const toque = document.createElement('div');
    toque.className = 'sorpresa-toque';
    toque.textContent = 'Toca para entrar';

    capa.append(lienzo, contenido, toque);
    document.body.appendChild(capa);

    const lluvia = crearLluviaPetalos(lienzo, {
        colores,
        cantidad: ancho => reducirMovimiento ? 24 : Math.min(110, Math.round(ancho / 11)),
        estatico: reducirMovimiento
    });

    function cerrar() {
        capa.classList.add('saliendo');
        setTimeout(() => {
            lluvia.detener();
            capa.remove();
        }, 1300);
    }

    capa.addEventListener('click', cerrar);
})();
