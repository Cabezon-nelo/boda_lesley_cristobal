function crearLluviaPetalos(lienzo, opciones) {
    const { colores, cantidad, estatico = false, opacidad = 0.92 } = opciones;
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

    function dibujar(p, t) {
        const frente = Math.abs(Math.cos(p.volteo + t * 1.4));
        ctx.save();
        ctx.translate(p.x + Math.sin(t * 0.9 + p.fase) * p.vaiven, p.y);
        ctx.rotate(p.angulo);
        ctx.scale(0.35 + frente * 0.65, 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacidad;
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
        ctx.clearRect(0, 0, ancho, alto);
        petalos.forEach((p, i) => {
            p.y += p.velocidad * dt;
            p.angulo += p.giro * dt;
            if (p.y > alto + p.tamano * 2) petalos[i] = nuevoPetalo(false);
            dibujar(p, ahora / 1000);
        });
        animacion = requestAnimationFrame(cuadro);
    }

    function crear() {
        const total = typeof cantidad === 'function' ? cantidad(ancho) : cantidad;
        petalos = Array.from({ length: total }, () => nuevoPetalo(true));
    }

    function redimensionar() {
        ajustar();
        if (estatico) petalos.forEach(p => dibujar(p, 0));
    }

    ajustar();
    crear();
    window.addEventListener('resize', redimensionar);
    if (estatico) petalos.forEach(p => dibujar(p, 0));
    else animacion = requestAnimationFrame(cuadro);

    return {
        detener() {
            cancelAnimationFrame(animacion);
            window.removeEventListener('resize', redimensionar);
        }
    };
}
