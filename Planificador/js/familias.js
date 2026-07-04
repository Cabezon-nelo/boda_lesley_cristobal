        // --- GESTIÓN DE GRUPOS FAMILIARES (Módulo 2) ---

        // Solo se muestran invitados "Formulario Directo" (no estaban en la lista oficial) que aún no tienen familia.
        // Los invitados oficiales cotejados no entran aquí: se asume que ya están correctamente identificados
        // de forma individual desde la carga oficial.
        function renderizarPestanaFamilias() {
            let tbody = document.getElementById("tbody-seleccion-familias");
            if (!tbody) return;
            tbody.innerHTML = "";

            invitadosCotejados.forEach((inv, index) => {
                if (inv.enListaOficial === false && !inv.familiaManual) {
                    tbody.innerHTML += `
                        <tr>
                            <td>
                                <input type="checkbox" class="chk-invitado-familia" data-index="${index}" style="transform: scale(1.2);">
                            </td>
                            <td>
                                <strong>${inv.nombre}</strong><br>
                                <span style="font-size:0.8em; color:#777;">Resp: ${inv.nombreFormulario}</span>
                            </td>
                            <td>${inv.estado}</td>
                        </tr>
                    `;
                }
            });
        }

        // Las familias que ya existen se derivan directamente de estructuraFamilias
        // (ya no del truco de escribir "Familia X" en la carga masiva).
        function poblarSelectorFamiliaDestino() {
            let selector = document.getElementById("sel-familia-destino");
            if (!selector) return;
            let valorPrevio = selector.value;
            selector.innerHTML = `<option value="">-- Elegir familia --</option>`;

            Object.keys(estructuraFamilias).forEach(nombre => {
                selector.innerHTML += `<option value="${nombre}">${nombre}</option>`;
            });

            selector.innerHTML += `<option value="__nueva__">➕ Crear nueva familia...</option>`;

            if (valorPrevio && [...selector.options].some(o => o.value === valorPrevio)) {
                selector.value = valorPrevio;
            }
            onCambioFamiliaDestino();
        }

        function onCambioFamiliaDestino() {
            let selector = document.getElementById("sel-familia-destino");
            let inputNueva = document.getElementById("nueva-familia-nombre");
            if (!selector || !inputNueva) return;
            inputNueva.style.display = selector.value === "__nueva__" ? "block" : "none";
        }

        async function agregarIntegrantesAFamilia() {
            let selector = document.getElementById("sel-familia-destino");
            if (!selector) return alert("No se encontró el selector de familias.");

            let nombreFamilia;
            if (selector.value === "__nueva__") {
                nombreFamilia = document.getElementById("nueva-familia-nombre").value.trim();
                if (!nombreFamilia) return alert("Escribe un nombre para la nueva familia.");
            } else {
                nombreFamilia = selector.value.trim();
                if (!nombreFamilia) return alert("Elige una familia o crea una nueva.");
            }

            let checkboxes = document.querySelectorAll(".chk-invitado-familia:checked");
            if (checkboxes.length === 0) return alert("Selecciona al menos un invitado.");

            let filas = [];
            checkboxes.forEach(chk => {
                let index = parseInt(chk.dataset.index);
                let invitado = invitadosCotejados[index];
                if (invitado.filaExcel) filas.push(invitado.filaExcel);
            });

            const btn = document.querySelector('button[onclick="agregarIntegrantesAFamilia()"]');
            const textoOriginal = btn.innerText;
            btn.innerText = "Guardando... ⏳";
            btn.disabled = true;

            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: "POST",
                    body: JSON.stringify({
                        accion: "guardar_familia",
                        familia: nombreFamilia,
                        filas: filas
                    })
                });
                await cargarDatosDesdeExcel();
                document.querySelectorAll(".chk-invitado-familia").forEach(c => c.checked = false);
                alert(`Grupo "${nombreFamilia}" actualizado correctamente.`);
            } catch (e) {
                alert("No fue posible guardar la familia.");
            } finally {
                btn.innerText = textoOriginal;
                btn.disabled = false;
            }
        }

        // --- FAMILIAS EXISTENTES (solo lectura, igual que las fichas de invitados) ---
        function generarIntegranteFamiliaHTML(inv) {
            let limpioAcomp = inv.detalleFamilia ? inv.detalleFamilia.trim().toLowerCase() : "";
            let tieneAcompanantesTexto = limpioAcomp !== "" && limpioAcomp !== "-" && limpioAcomp !== "0" && limpioAcomp !== "no" && limpioAcomp !== "ninguno" && limpioAcomp !== "ninguna" && limpioAcomp !== "sin acompañantes";

            let htmlAcompanantes = '';
            if (tieneAcompanantesTexto) {
                htmlAcompanantes = inv.detalleFamilia.split('|').map(item => `<div class="familia-integrante-acomp">• ${item.trim()}</div>`).join('');
            }

            return `
                <div class="familia-integrante">
                    <span>${inv.nombre}</span>
                    ${htmlAcompanantes}
                </div>
            `;
        }

        function renderizarFamiliasExistentes() {
            const contenedor = document.getElementById('familias-existentes-contenedor');
            if (!contenedor) return;
            contenedor.innerHTML = '';

            let nombresFamilias = Object.keys(estructuraFamilias);
            if (nombresFamilias.length === 0) {
                contenedor.innerHTML = `<p style="color:#888;">Todavía no has creado ninguna familia.</p>`;
                return;
            }

            nombresFamilias.forEach(nombreFamilia => {
                let integrantes = estructuraFamilias[nombreFamilia].integrantes;
                let integrantesHTML = integrantes.map(inv => generarIntegranteFamiliaHTML(inv)).join('');

                contenedor.innerHTML += `
                    <details class="familia-acordeon">
                        <summary class="familia-resumen">
                            👪 ${nombreFamilia}
                            <span class="familia-resumen-detalle">${generarResumenFamilia(integrantes)}</span>
                        </summary>
                        <div class="familia-integrantes-lista">${integrantesHTML}</div>
                    </details>
                `;
            });
        }
