function cambiarPagina(idPagina, elementoClicado) {
    document.querySelectorAll('.page-section').forEach(seccion => {
        seccion.classList.remove('active');
    });
    document.getElementById(idPagina).classList.add('active');

    document.querySelectorAll('.nav-links a').forEach(enlace => {
        enlace.classList.remove('active-link');
    });
    elementoClicado.classList.add('active-link');

    window.scrollTo(0, 0);
}
