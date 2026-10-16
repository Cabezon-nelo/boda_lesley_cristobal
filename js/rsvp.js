let contadorAcompanantes = 0;

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzn1VFpYVGpV1UxyKg13k3pcG2KeIjTBA_1igHHlfwMKGZRhzJ7t1rx45gV35TOr_v-/exec";

function toggleDetallesTitular() {
    const asistencia = document.querySelector('input[name="asistencia"]:checked').value;
    const detallesDiv = document.getElementById('detallesTitular');
    const menuInputs = document.querySelectorAll('input[name="menuTitular"]');

    if (asistencia === 'si') {
        detallesDiv.classList.remove('hidden');
        menuInputs.forEach(input => input.setAttribute('required', 'true'));
    } else {
        detallesDiv.classList.add('hidden');
        menuInputs.forEach(input => input.removeAttribute('required'));
        document.getElementById('contenedorAcompanantes').innerHTML = '';
        contadorAcompanantes = 0;
    }
}

function toggleRestriccion(id) {
    const radioRestriccion = document.querySelector(`input[name="menu${id}"][value="restriccion"]`);
    const container = document.getElementById(`restriccion${id}Container`);
    const inputField = document.getElementById(`restriccion${id}`);

    if (radioRestriccion && radioRestriccion.checked) {
        container.classList.remove('hidden');
        inputField.setAttribute('required', 'true');
    } else {
        container.classList.add('hidden');
        inputField.removeAttribute('required');
        inputField.value = '';
    }
}

function agregarAcompanante() {
    contadorAcompanantes++;
    const idActual = contadorAcompanantes;

    const div = document.createElement('div');
    div.className = 'acompanante-item';
    div.id = `acompananteRow_${idActual}`;

    div.innerHTML = `
        <button type="button" class="btn-eliminar" onclick="eliminarAcompanante(${idActual})">✕ Quitar</button>
        <div class="form-group">
            <label>Nombre acompañante / familiar</label>
            <input type="text" name="nombreAcom_${idActual}" required placeholder="Nombre completo">
        </div>
        <div class="form-group" style="margin-bottom:0;">
            <label>Menú</label>
            <div class="radio-group">
                <label class="radio-item"><input type="radio" name="menuAcom_${idActual}" value="tradicional" required onchange="toggleRestriccion('Acom_${idActual}')"> Tradicional</label>
                <label class="radio-item"><input type="radio" name="menuAcom_${idActual}" value="vegetariano" onchange="toggleRestriccion('Acom_${idActual}')"> Vegetariano</label>
                <label class="radio-item"><input type="radio" name="menuAcom_${idActual}" value="restriccion" onchange="toggleRestriccion('Acom_${idActual}')"> Restricción alimentaria</label>
            </div>
            <div id="restriccionAcom_${idActual}Container" class="restriccion-input hidden">
                <input type="text" id="restriccionAcom_${idActual}" name="restriccionAcom_${idActual}" placeholder="Indique qué alimentos no puede consumir">
            </div>
        </div>
    `;

    document.getElementById('contenedorAcompanantes').appendChild(div);
}

function eliminarAcompanante(id) {
    const elemento = document.getElementById(`acompananteRow_${id}`);
    if (elemento) {
        elemento.remove();
    }
}

document.getElementById('rsvpForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const btnEnviar = document.querySelector('#asistencia .btn-primary');
    btnEnviar.innerText = "Enviando...";
    btnEnviar.disabled = true;

    const nombreInvitado = document.getElementById('nombreInvitado').value;
    const asistencia = document.querySelector('input[name="asistencia"]:checked').value;

    let payload = {
        nombreInvitado: nombreInvitado,
        asistencia: asistencia,
        menuTitular: asistencia === 'si' ? document.querySelector('input[name="menuTitular"]:checked').value : 'no_asiste',
        restriccionTitular: asistencia === 'si' ? document.getElementById('restriccionTitular').value : '',
        acompanantes: []
    };

    if (asistencia === 'si') {
        const filasAcompanantes = document.querySelectorAll('.acompanante-item');
        filasAcompanantes.forEach(fila => {
            const id = fila.id.split('_')[1];
            const nombreAcom = fila.querySelector(`input[name="nombreAcom_${id}"]`).value;
            const menuAcom = fila.querySelector(`input[name="menuAcom_${id}"]:checked`).value;
            const restriccionAcom = fila.querySelector(`input[name="restriccionAcom_${id}"]`).value;

            payload.acompanantes.push({ nombre: nombreAcom, menu: menuAcom, restriccion: restriccionAcom });
        });
    }

    fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(resultado => {
        if (resultado.status === 'success') {
            let mensajeExito = "¡Muchas gracias! Tu confirmación ha sido registrada.";
            if (resultado.advertencia) {
                mensajeExito += "\n\n" + resultado.advertencia;
            }
            alert(mensajeExito);
            document.getElementById('rsvpForm').reset();
            document.getElementById('detallesTitular').classList.add('hidden');
        } else if (resultado.status === 'duplicado') {
            alert(resultado.message || "Ya hemos recibido una confirmación bajo este nombre.");
        } else {
            alert("Hubo un problema al enviar los datos. Inténtalo de nuevo.");
        }
        btnEnviar.innerText = "Enviar Confirmación";
        btnEnviar.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Hubo un problema al enviar los datos. Inténtalo de nuevo.");
        btnEnviar.innerText = "Enviar Confirmación";
        btnEnviar.disabled = false;
    });
});
