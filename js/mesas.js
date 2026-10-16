function normalizarTexto(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function crearTarjetaMesa(grupo, encontrados, indice) {
    const item = document.createElement('div');
    item.className = 'mesa-item';
    item.style.setProperty('--i', indice);

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'mesa-flip';
    boton.setAttribute('aria-label', 'Mesa ' + grupo.numero + ': ver quiénes la integran');
    boton.addEventListener('click', () => boton.classList.toggle('volteada'));

    const interior = document.createElement('span');
    interior.className = 'mesa-flip-inner';

    const frente = document.createElement('img');
    frente.className = 'mesa-cara mesa-frente';
    frente.src = 'assets/mesas/mesa-' + grupo.numero + '-frente.jpg';
    frente.alt = 'Tarjeta de la mesa ' + grupo.numero;
    frente.loading = 'lazy';
    frente.draggable = false;

    const dorso = document.createElement('span');
    dorso.className = 'mesa-cara mesa-dorso';
    dorso.style.backgroundImage = "url('assets/mesas/mesa-dorso-base.jpg')";
    const titulo = document.createElement('span');
    titulo.className = 'mesa-dorso-titulo';
    titulo.textContent = 'MESA ' + grupo.numero;
    const lista = document.createElement('ul');
    lista.className = 'mesa-dorso-lista';
    grupo.invitados.forEach(nombre => {
        const li = document.createElement('li');
        li.textContent = nombre;
        if (encontrados.includes(nombre)) li.className = 'destacado';
        lista.appendChild(li);
    });
    dorso.append(titulo, lista);

    interior.append(frente, dorso);
    boton.appendChild(interior);
    item.appendChild(boton);

    if (encontrados.length) {
        const hallado = document.createElement('div');
        hallado.className = 'mesa-hallado';
        const fuerte = document.createElement('strong');
        fuerte.textContent = encontrados.join(' · ');
        hallado.append('Mesa ' + grupo.numero + ' — ', fuerte);
        item.appendChild(hallado);
        setTimeout(() => boton.classList.add('volteada'), 900);
    }
    return item;
}

function buscarMesa() {
    const contenedor = document.getElementById('mesaResultados');
    const palabras = normalizarTexto(document.getElementById('mesaBusqueda').value).split(/\s+/).filter(Boolean);
    contenedor.innerHTML = '';
    const buscando = palabras.join('').length >= 2;

    const resultados = [];
    MESAS.forEach(grupo => {
        const encontrados = buscando ? grupo.invitados.filter(nombre => {
            const normalizado = normalizarTexto(nombre);
            return palabras.every(p => normalizado.includes(p));
        }) : [];
        if (!buscando || encontrados.length) resultados.push({ grupo, encontrados });
    });

    contenedor.classList.toggle('pocas', buscando && resultados.length <= 2);
    contenedor.nextElementSibling && contenedor.nextElementSibling.remove();

    if (buscando && resultados.length === 0) {
        const vacio = document.createElement('div');
        vacio.className = 'mesa-vacio';
        vacio.textContent = 'No encontramos ese nombre. Prueba con otro apellido o escríbenos si crees que es un error.';
        contenedor.parentNode.appendChild(vacio);
        return;
    }
    resultados.forEach(({ grupo, encontrados }, i) => contenedor.appendChild(crearTarjetaMesa(grupo, encontrados, i)));
}

buscarMesa();
