(function () {
    const escenario = document.getElementById('escenario');
    const fondo = document.getElementById('fondo');
    const avisoEl = document.getElementById('aviso');
    const barra = document.getElementById('barra');
    const panel = document.getElementById('panel');
    const zona = document.getElementById('zona');
    const estadoEl = document.getElementById('estado');
    const botonIniciar = document.getElementById('iniciar');
    const botonVaciar = document.getElementById('vaciar');
    const botonPausa = document.getElementById('botonPausa');
    const botonSonido = document.getElementById('botonSonido');

    const EXTENSIONES_FOTO = /\.(jpe?g|png|webp|gif|avif)$/i;
    const EXTENSIONES_VIDEO = /\.(mp4|mov|m4v|webm)$/i;
    const EXTENSIONES_HEIC = /\.(heic|heif)$/i;
    const INTERVALO = 250;

    let cola = [];
    const ids = new Set();
    let indice = 0;
    let reproduciendo = false;
    let pausado = false;
    let sonido = true;
    let secuencia = 0;
    let fallos = 0;
    let transcurrido = 0;
    let diapoActual = null;
    let medioActual = null;
    let itemActual = null;
    let urlFondo = null;
    let temporizadorAviso = 0;
    let temporizadorBarra = 0;
    let bd = null;

    crearLluviaPetalos(document.getElementById('petalos'), {
        colores: ['#fffaf0', '#f6dfe0', '#f1c9cf', '#e9cf8a', '#d9b25c'],
        cantidad: ancho => Math.min(45, Math.round(ancho / 30)),
        opacidad: 0.5,
        estatico: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });

    function avisar(texto) {
        avisoEl.textContent = texto;
        avisoEl.classList.add('visible');
        clearTimeout(temporizadorAviso);
        temporizadorAviso = setTimeout(() => avisoEl.classList.remove('visible'), 4000);
    }

    function abrirBD() {
        return new Promise((resolver, rechazar) => {
            const peticion = indexedDB.open('galeria-boda', 1);
            peticion.onupgradeneeded = () => peticion.result.createObjectStore('archivos', { keyPath: 'id' });
            peticion.onsuccess = () => resolver(peticion.result);
            peticion.onerror = () => rechazar(peticion.error);
        });
    }

    function transaccion(modo, accion) {
        return new Promise((resolver, rechazar) => {
            const tx = bd.transaction('archivos', modo);
            const resultado = accion(tx.objectStore('archivos'));
            tx.oncomplete = () => resolver(resultado && resultado.result);
            tx.onerror = () => rechazar(tx.error);
            tx.onabort = () => rechazar(tx.error);
        });
    }

    async function guardar(items) {
        if (!bd || !items.length) return;
        try {
            await transaccion('readwrite', store => items.forEach(i => store.put({ id: i.id, tipo: i.tipo, archivo: i.archivo, fecha: i.fecha })));
        } catch (e) {
            avisar('No se pudo guardar una copia: al cerrar la página habrá que cargar los archivos de nuevo');
        }
    }

    function tipoDe(archivo) {
        if (EXTENSIONES_HEIC.test(archivo.name) || /heic|heif/.test(archivo.type)) return null;
        if (archivo.type.startsWith('image/') || EXTENSIONES_FOTO.test(archivo.name)) return 'foto';
        if (archivo.type.startsWith('video/') || EXTENSIONES_VIDEO.test(archivo.name)) return 'video';
        return null;
    }

    function crearItem(archivo, tipo) {
        return { id: archivo.name + '|' + archivo.size + '|' + archivo.lastModified, tipo, archivo, fecha: archivo.lastModified };
    }

    function mezclar(lista) {
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }
        return lista;
    }

    function actualizarEstado() {
        const fotos = cola.filter(i => i.tipo === 'foto').length;
        const videos = cola.length - fotos;
        estadoEl.textContent = cola.length ? cola.length + ' archivos listos (' + fotos + ' fotos, ' + videos + ' videos)' : '';
        botonIniciar.disabled = cola.length === 0;
        botonIniciar.textContent = reproduciendo ? 'Volver a la proyección' : 'Iniciar proyección';
        botonVaciar.hidden = cola.length === 0;
    }

    async function agregar(archivos) {
        const nuevos = [];
        let incompatibles = 0;
        let repetidos = 0;
        archivos.forEach(archivo => {
            const tipo = tipoDe(archivo);
            if (!tipo) { incompatibles++; return; }
            const item = crearItem(archivo, tipo);
            if (ids.has(item.id)) { repetidos++; return; }
            ids.add(item.id);
            nuevos.push(item);
        });
        nuevos.sort((a, b) => a.fecha - b.fecha);
        if (reproduciendo) cola.splice(indice + 1, 0, ...nuevos);
        else cola.push(...nuevos);
        if (!reproduciendo) cola.sort((a, b) => a.fecha - b.fecha);
        actualizarEstado();
        let mensaje = nuevos.length + ' agregados';
        if (repetidos) mensaje += ', ' + repetidos + ' ya estaban';
        if (incompatibles) mensaje += ', ' + incompatibles + ' no compatibles (las fotos HEIC hay que convertirlas a JPG)';
        avisar(mensaje);
        if (!panel.hidden) estadoEl.textContent += ' · ' + mensaje;
        await guardar(nuevos);
        if (reproduciendo && !itemActual && cola.length) mostrar(0);
    }

    async function leerEntrada(entrada, lista) {
        if (entrada.isFile) {
            lista.push(await new Promise((resolver, rechazar) => entrada.file(resolver, rechazar)));
            return;
        }
        const lector = entrada.createReader();
        let tanda;
        do {
            tanda = await new Promise((resolver, rechazar) => lector.readEntries(resolver, rechazar));
            for (const hija of tanda) await leerEntrada(hija, lista);
        } while (tanda.length);
    }

    async function archivosDeSoltado(transferencia) {
        const entradas = [...transferencia.items].map(i => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
        if (!entradas.length) return [...transferencia.files];
        const lista = [];
        for (const entrada of entradas) await leerEntrada(entrada, lista);
        return lista;
    }

    function retirar(diapo) {
        diapo.classList.remove('entra');
        diapo.classList.add('sale');
        setTimeout(() => {
            const video = diapo.querySelector('video');
            if (video) video.pause();
            URL.revokeObjectURL(diapo.dataset.url);
            diapo.remove();
        }, 1500);
    }

    function actualizarFondo(item) {
        const anterior = urlFondo;
        if (item.tipo === 'foto') {
            urlFondo = URL.createObjectURL(item.archivo);
            fondo.style.backgroundImage = 'url("' + urlFondo + '")';
            fondo.classList.add('visible');
        } else {
            urlFondo = null;
            fondo.classList.remove('visible');
        }
        if (anterior) setTimeout(() => URL.revokeObjectURL(anterior), 2000);
    }

    function reproducirVideo(video) {
        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
            avisar('El navegador puso el video en silencio: pulsa M para activar el sonido');
        });
    }

    async function mostrar(nuevoIndice) {
        if (!cola.length) return;
        indice = ((nuevoIndice % cola.length) + cola.length) % cola.length;
        const item = cola[indice];
        const token = ++secuencia;
        const url = URL.createObjectURL(item.archivo);
        const diapo = document.createElement('div');
        diapo.className = 'diapo';
        diapo.dataset.url = url;
        diapo.style.setProperty('--duracion', duracionFoto() + 's');
        let medio;

        const fallar = () => {
            URL.revokeObjectURL(url);
            if (token !== secuencia) return;
            fallos++;
            avisar('No se pudo mostrar ' + item.archivo.name);
            if (fallos < cola.length) setTimeout(() => { if (token === secuencia) siguiente(); }, 400);
        };

        if (item.tipo === 'foto') {
            medio = new Image();
            medio.src = url;
            try { await medio.decode(); } catch (e) { fallar(); return; }
        } else {
            medio = document.createElement('video');
            medio.playsInline = true;
            medio.muted = !sonido;
            medio.preload = 'auto';
            medio.src = url;
            medio.addEventListener('ended', () => { if (token === secuencia) siguiente(); });
            medio.addEventListener('error', fallar);
        }
        if (token !== secuencia) { URL.revokeObjectURL(url); return; }

        fallos = 0;
        diapo.appendChild(medio);
        escenario.appendChild(diapo);
        const anterior = diapoActual;
        diapoActual = diapo;
        medioActual = medio;
        itemActual = item;
        transcurrido = 0;
        requestAnimationFrame(() => requestAnimationFrame(() => diapo.classList.add('entra')));
        if (anterior) retirar(anterior);
        actualizarFondo(item);
        if (item.tipo === 'video' && !pausado) reproducirVideo(medio);
        if (item.tipo === 'foto' && pausado) medio.style.animationPlayState = 'paused';
    }

    function siguiente() { mostrar(indice + 1); }
    function anterior() { mostrar(indice - 1); }

    function duracionFoto() {
        return Number(document.getElementById('duracion').value);
    }

    function alternarPausa() {
        pausado = !pausado;
        botonPausa.textContent = pausado ? 'Reanudar' : 'Pausar';
        if (!medioActual) return;
        if (itemActual.tipo === 'video') {
            if (pausado) medioActual.pause(); else reproducirVideo(medioActual);
        } else {
            medioActual.style.animationPlayState = pausado ? 'paused' : 'running';
        }
    }

    function alternarSonido() {
        sonido = !sonido;
        botonSonido.textContent = 'Sonido: ' + (sonido ? 'sí' : 'no');
        if (medioActual && itemActual.tipo === 'video') medioActual.muted = !sonido;
    }

    function mezclarRestantes() {
        if (!itemActual) return;
        const resto = cola.filter(i => i !== itemActual);
        cola = [itemActual, ...mezclar(resto)];
        indice = 0;
        avisar('Orden mezclado');
    }

    function alternarPantalla() {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
    }

    function abrirPanel() {
        panel.hidden = false;
        actualizarEstado();
    }

    function cerrarPanel() {
        if (reproduciendo) panel.hidden = true;
    }

    function iniciar() {
        if (reproduciendo) { cerrarPanel(); return; }
        if (!cola.length) return;
        if (document.getElementById('orden').value === 'aleatorio') mezclar(cola);
        reproduciendo = true;
        panel.hidden = true;
        barra.hidden = false;
        actualizarEstado();
        mostrar(0);
        mostrarBarra();
    }

    function mostrarBarra() {
        barra.classList.add('visible');
        document.body.classList.remove('oculto-cursor');
        clearTimeout(temporizadorBarra);
        temporizadorBarra = setTimeout(() => {
            barra.classList.remove('visible');
            if (reproduciendo && panel.hidden) document.body.classList.add('oculto-cursor');
        }, 3000);
    }

    async function vaciar() {
        if (!window.confirm('¿Borrar todos los archivos guardados en este computador?')) return;
        if (bd) { try { await transaccion('readwrite', store => store.clear()); } catch (e) {} }
        cola = [];
        ids.clear();
        reproduciendo = false;
        itemActual = null;
        medioActual = null;
        secuencia++;
        if (diapoActual) { diapoActual.remove(); diapoActual = null; }
        fondo.classList.remove('visible');
        barra.hidden = true;
        actualizarEstado();
        abrirPanel();
    }

    const acciones = {
        agregar: abrirPanel,
        anterior,
        pausa: alternarPausa,
        siguiente,
        sonido: alternarSonido,
        mezclar: mezclarRestantes,
        pantalla: alternarPantalla
    };

    barra.addEventListener('click', e => {
        const boton = e.target.closest('button');
        if (boton && acciones[boton.dataset.accion]) acciones[boton.dataset.accion]();
    });

    document.addEventListener('keydown', e => {
        if (e.target.matches('select, input')) return;
        const tecla = e.key.toLowerCase();
        if (tecla === 'h' || tecla === 'a') { panel.hidden ? abrirPanel() : cerrarPanel(); return; }
        if (tecla === 'escape') { cerrarPanel(); return; }
        if (!reproduciendo || !panel.hidden) return;
        if (tecla === ' ') { e.preventDefault(); alternarPausa(); }
        else if (tecla === 'arrowright') siguiente();
        else if (tecla === 'arrowleft') anterior();
        else if (tecla === 'm') alternarSonido();
        else if (tecla === 'f') alternarPantalla();
    });

    document.addEventListener('mousemove', () => { if (reproduciendo) mostrarBarra(); });

    window.addEventListener('dragover', e => {
        e.preventDefault();
        zona.classList.add('activa');
    });
    window.addEventListener('dragleave', e => {
        if (!e.relatedTarget) zona.classList.remove('activa');
    });
    window.addEventListener('drop', async e => {
        e.preventDefault();
        zona.classList.remove('activa');
        agregar(await archivosDeSoltado(e.dataTransfer));
    });

    ['entradaArchivos', 'entradaCarpeta'].forEach(id => {
        const entrada = document.getElementById(id);
        entrada.addEventListener('change', () => {
            agregar([...entrada.files]);
            entrada.value = '';
        });
    });

    botonIniciar.addEventListener('click', iniciar);
    botonVaciar.addEventListener('click', vaciar);

    setInterval(() => {
        if (!reproduciendo || pausado || !itemActual || itemActual.tipo !== 'foto') return;
        transcurrido += INTERVALO;
        if (transcurrido >= duracionFoto() * 1000) siguiente();
    }, INTERVALO);

    (async function restaurar() {
        try {
            bd = await abrirBD();
            const guardados = await transaccion('readonly', store => store.getAll());
            guardados.forEach(g => {
                ids.add(g.id);
                cola.push(g);
            });
            cola.sort((a, b) => a.fecha - b.fecha);
        } catch (e) {
            bd = null;
        }
        actualizarEstado();
        if (cola.length) estadoEl.textContent += ' (guardados de la sesión anterior)';
    })();
})();
