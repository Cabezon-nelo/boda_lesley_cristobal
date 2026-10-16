(function () {
    const preview = new URLSearchParams(location.search).has('preview');
    const espera = document.getElementById('espera');
    const escena = document.getElementById('escena');
    const DURACION_MODO = 30;
    let iniciada = false;

    function revisar() {
        if (iniciada) return;
        if (!preview && !esDiaDeBoda()) return;
        iniciada = true;
        espera.hidden = true;
        escena.hidden = false;
        iniciarEscena();
    }

    document.addEventListener('keydown', e => {
        if (e.key !== 'f' && e.key !== 'F') return;
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
    });

    revisar();
    setInterval(revisar, 30000);

    function aleatorio(min, max) {
        return min + Math.random() * (max - min);
    }

    function texturaPetalo() {
        const lienzo = document.createElement('canvas');
        lienzo.width = 128;
        lienzo.height = 180;
        const c = lienzo.getContext('2d');
        const gradiente = c.createLinearGradient(0, 0, 0, 180);
        gradiente.addColorStop(0, '#ffffff');
        gradiente.addColorStop(1, '#d9d0c4');
        c.fillStyle = gradiente;
        c.beginPath();
        c.moveTo(64, 6);
        c.bezierCurveTo(124, 40, 112, 140, 64, 174);
        c.bezierCurveTo(16, 140, 4, 40, 64, 6);
        c.fill();
        return new THREE.CanvasTexture(lienzo);
    }

    function texturaBrillo() {
        const lienzo = document.createElement('canvas');
        lienzo.width = lienzo.height = 64;
        const c = lienzo.getContext('2d');
        const gradiente = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradiente.addColorStop(0, 'rgba(255,255,255,1)');
        gradiente.addColorStop(0.3, 'rgba(255,255,255,0.45)');
        gradiente.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gradiente;
        c.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(lienzo);
    }

    function texturaMonograma() {
        const lienzo = document.createElement('canvas');
        lienzo.width = lienzo.height = 1024;
        const c = lienzo.getContext('2d');
        c.fillStyle = '#ffffff';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = '700 620px "Playfair Display", serif';
        c.fillText('L', 360, 500);
        c.fillText('C', 650, 540);
        c.font = '240px "Great Vibes", cursive';
        c.fillText('y', 520, 330);
        return new THREE.CanvasTexture(lienzo);
    }

    async function iniciarEscena() {
        try {
            await Promise.all([
                document.fonts.load('700 200px "Playfair Display"'),
                document.fonts.load('200px "Great Vibes"')
            ]);
        } catch (e) {}

        const lienzo = document.getElementById('lienzo');
        const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        const escenaGl = new THREE.Scene();
        const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camara.position.z = 16;

        function ajustar() {
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            camara.aspect = window.innerWidth / window.innerHeight;
            camara.updateProjectionMatrix();
        }
        ajustar();
        window.addEventListener('resize', ajustar);

        const mapaPetalo = texturaPetalo();
        const geometriaPetalo = new THREE.PlaneGeometry(0.6, 0.85);
        const coloresPetalo = [0xffffff, 0xf7e9d7, 0xf3cfd3, 0xe6c46a, 0xd9a84a];
        const petalos = [];

        function reubicar(p, inicial) {
            p.malla.position.set(aleatorio(-15, 15), inicial ? aleatorio(-10, 10) : aleatorio(10, 14), aleatorio(-8, 8));
            p.malla.scale.setScalar(aleatorio(0.6, 1.5));
            p.malla.rotation.set(aleatorio(0, 6.28), aleatorio(0, 6.28), aleatorio(0, 6.28));
            p.velocidad = aleatorio(0.6, 1.5);
            p.giro = new THREE.Vector3(aleatorio(-1.5, 1.5), aleatorio(-1.5, 1.5), aleatorio(-1, 1));
            p.fase = aleatorio(0, 6.28);
            p.base = aleatorio(0.65, 1);
        }

        for (let i = 0; i < 150; i++) {
            const material = new THREE.MeshBasicMaterial({
                map: mapaPetalo,
                color: coloresPetalo[i % coloresPetalo.length],
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const p = { malla: new THREE.Mesh(geometriaPetalo, material) };
            reubicar(p, true);
            escenaGl.add(p.malla);
            petalos.push(p);
        }

        const CANTIDAD_BRILLOS = 500;
        const posiciones = new Float32Array(CANTIDAD_BRILLOS * 3);
        for (let i = 0; i < CANTIDAD_BRILLOS; i++) {
            posiciones[i * 3] = aleatorio(-16, 16);
            posiciones[i * 3 + 1] = aleatorio(-10, 10);
            posiciones[i * 3 + 2] = aleatorio(-9, 9);
        }
        const geometriaBrillos = new THREE.BufferGeometry();
        geometriaBrillos.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
        const materialBrillos = new THREE.PointsMaterial({
            map: texturaBrillo(),
            color: 0xf0c860,
            size: 0.38,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        escenaGl.add(new THREE.Points(geometriaBrillos, materialBrillos));

        const monograma = new THREE.Group();
        const mapaMonograma = texturaMonograma();
        const capas = [];
        const CAPAS = 16;
        for (let i = 0; i < CAPAS; i++) {
            const f = i / (CAPAS - 1);
            const color = new THREE.Color(0x6e4f14).lerp(new THREE.Color(0xf4d98a), f);
            const material = new THREE.MeshBasicMaterial({ map: mapaMonograma, color, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide });
            const capa = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
            capa.position.z = (f - 0.5) * 0.22;
            monograma.add(capa);
            capas.push(material);
        }
        monograma.scale.setScalar(9);
        escenaGl.add(monograma);

        let nivelPetalos = 1;
        let nivelMono = 0;
        let objetivoPetalos = 1;
        let objetivoMono = 0;
        const modos = ['petalos', 'monograma'];
        let indiceModo = 0;

        setInterval(() => {
            indiceModo = (indiceModo + 1) % modos.length;
            const modo = modos[indiceModo];
            document.body.dataset.modo = modo;
            objetivoPetalos = modo === 'petalos' ? 1 : 0.35;
            objetivoMono = modo === 'monograma' ? 1 : 0;
        }, DURACION_MODO * 1000);

        const reloj = new THREE.Clock();
        function cuadro() {
            const dt = Math.min(reloj.getDelta(), 0.05);
            const t = reloj.elapsedTime;
            const suavizado = Math.min(1, dt * 1.2);
            nivelPetalos += (objetivoPetalos - nivelPetalos) * suavizado;
            nivelMono += (objetivoMono - nivelMono) * suavizado;

            petalos.forEach(p => {
                const m = p.malla;
                m.position.y -= p.velocidad * dt;
                m.position.x += Math.sin(t * 0.8 + p.fase) * 0.6 * dt;
                m.rotation.x += p.giro.x * dt;
                m.rotation.y += p.giro.y * dt;
                m.rotation.z += p.giro.z * dt;
                m.material.opacity = p.base * nivelPetalos;
                if (m.position.y < -11) reubicar(p, false);
            });

            materialBrillos.opacity = 0.65 + 0.25 * Math.sin(t * 1.3);
            const arr = geometriaBrillos.attributes.position.array;
            for (let i = 0; i < CANTIDAD_BRILLOS; i++) {
                arr[i * 3 + 1] += 0.25 * dt;
                if (arr[i * 3 + 1] > 10) arr[i * 3 + 1] = -10;
            }
            geometriaBrillos.attributes.position.needsUpdate = true;

            monograma.visible = nivelMono > 0.01;
            capas.forEach(m => { m.opacity = nivelMono; });
            monograma.rotation.y = t * 0.55;
            monograma.rotation.x = Math.sin(t * 0.4) * 0.12;
            monograma.position.y = Math.sin(t * 0.7) * 0.25;
            monograma.scale.setScalar(6 + 3 * nivelMono);

            renderer.render(escenaGl, camara);
            requestAnimationFrame(cuadro);
        }
        cuadro();
    }
})();
