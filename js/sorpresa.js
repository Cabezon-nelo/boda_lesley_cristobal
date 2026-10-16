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

    const ctx = lienzo.getContext('2d');
    let ancho = 0;
    let alto = 0;
    let petalos = [];
    let animacion = 0;
    let anterior = performance.now();

    function ajustar() {
        const escala = Math.min(window.devicePixelRatio || 1, 2);
        ancho = window.innerWidth;
        alto = window.innerHeight;
        lienzo.width = ancho * escala;
        lienzo.height = alto * escala;
        ctx.setTransform(escala, 0, 0, escala, 0, 0);
    }

    function nuevoPetalo(inicial) {
        const tamano = 10 + Math.random() * 16;
        return {
            x: Math.random() * ancho,
            y: inicial ? Math.random() * alto : -tamano * 2 - Math.random() * alto * 0.4,
            tamano,
            velocidad: 40 + Math.random() * 70,
            vaiven: 20 + Math.random() * 40,
            fase: Math.random() * Math.PI * 2,
            giro: (Math.random() - 0.5) * 3,
            angulo: Math.random() * Math.PI * 2,
            volteo: Math.random() * Math.PI * 2,
            color: colores[Math.floor(Math.random() * colores.length)]
        };
    }

    function dibujarPetalo(p, t) {
        const ancho3d = Math.abs(Math.cos(p.volteo + t * 1.4));
        ctx.save();
        ctx.translate(p.x + Math.sin(t * 0.9 + p.fase) * p.vaiven, p.y);
        ctx.rotate(p.angulo);
        ctx.scale(0.35 + ancho3d * 0.65, 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.92;
        ctx.beginPath();
        ctx.moveTo(0, -p.tamano);
        ctx.bezierCurveTo(p.tamano * 0.9, -p.tamano * 0.5, p.tamano * 0.7, p.tamano * 0.7, 0, p.tamano);
        ctx.bezierCurveTo(-p.tamano * 0.7, p.tamano * 0.7, -p.tamano * 0.9, -p.tamano * 0.5, 0, -p.tamano);
        ctx.fill();
        ctx.restore();
    }

    function cuadro(ahora) {
        const dt = Math.min((ahora - anterior) / 1000, 0.05);
        anterior = ahora;
        const t = ahora / 1000;
        ctx.clearRect(0, 0, ancho, alto);
        petalos.forEach((p, i) => {
            p.y += p.velocidad * dt;
            p.angulo += p.giro * dt;
            if (p.y > alto + p.tamano * 2) petalos[i] = nuevoPetalo(false);
            dibujarPetalo(p, t);
        });
        animacion = requestAnimationFrame(cuadro);
    }

    function cerrar() {
        capa.classList.add('saliendo');
        setTimeout(() => {
            cancelAnimationFrame(animacion);
            window.removeEventListener('resize', ajustar);
            capa.remove();
        }, 1300);
    }

    ajustar();
    petalos = Array.from({ length: reducirMovimiento ? 24 : Math.min(110, Math.round(ancho / 11)) }, () => nuevoPetalo(true));
    window.addEventListener('resize', ajustar);
    capa.addEventListener('click', cerrar);
    if (reducirMovimiento) {
        petalos.forEach(p => dibujarPetalo(p, 0));
    } else {
        animacion = requestAnimationFrame(cuadro);
    }
})();
