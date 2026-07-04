        // --- ACCIONES DE MESAS ---
        async function crearMesa() {
            let nombre = document.getElementById('mesa-nombre').value.trim();
            let cap = parseInt(document.getElementById('mesa-capacidad').value);
            if(!nombre || !cap) return alert("Por favor completa ambos campos.");

            const btn = document.querySelector('button[onclick="crearMesa()"]');
            btn.innerText = "Guardando... ⏳";
            btn.disabled = true;

            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'crear_mesa', nombreMesa: nombre, capacidad: cap })
                });

                document.getElementById('mesa-nombre').value = '';
                document.getElementById('mesa-capacidad').value = '';
                await cargarDatosDesdeExcel();
                alert(`¡Mesa "${nombre}" guardada con éxito!`);
            } catch (e) {
                alert("Hubo un error al guardar la mesa.");
            } finally {
                btn.innerText = "Crear Mesa";
                btn.disabled = false;
            }
        }

        async function guardarMesaInvitado(fila) {
            const selector = document.getElementById(`sel-mesa-${fila}`);
            const mesaSeleccionada = selector.value;

            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'asignar_mesa', fila: fila, nuevaMesa: mesaSeleccionada })
                });
                alert("Mesa guardada con éxito.");
                await cargarDatosDesdeExcel();
            } catch(e) {
                alert("No se pudo guardar la asignación.");
            }
        }

        async function eliminarMesa(nombreMesa) {
            if (!confirm(`¿Estás seguro de que deseas eliminar la mesa "${nombreMesa}"?`)) return;
            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'eliminar_mesa', nombreMesa: nombreMesa })
                });
                alert(`Mesa "${nombreMesa}" eliminada.`);
                await cargarDatosDesdeExcel();
            } catch (e) {
                alert("Error al eliminar la mesa.");
            }
        }

        async function editarMesa(nombreOriginal, capacidadOriginal) {
            let nuevoNombre = prompt("Modifica el nombre de la mesa:", nombreOriginal);
            if (!nuevoNombre) return;

            let nuevaCapacidad = prompt("Modifica la capacidad máxima:", capacidadOriginal);
            if (!nuevaCapacidad || isNaN(nuevaCapacidad)) return;

            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({
                        accion: 'editar_mesa',
                        nombreOriginal: nombreOriginal,
                        nuevoNombre: nuevoNombre.trim(),
                        nuevaCapacidad: parseInt(nuevaCapacidad)
                    })
                });
                alert(`Mesa actualizada con éxito.`);
                await cargarDatosDesdeExcel();
            } catch (e) {
                alert("Error al editar la mesa.");
            }
        }

        // --- RENDER: MESAS DEFINIDAS Y ASIGNACIÓN DE ASIENTOS ---
        function renderizarMesasCreadas() {
            let soloConfirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');

            const tbodyMesas = document.getElementById('tabla-mesas-creadas');
            tbodyMesas.innerHTML = '';
            mesasBD.forEach(mesa => {
                let asignadosAqui = 0;
                let invitadosEnMesa = soloConfirmados.filter(inv => inv.mesaAsignada.toString().trim() === mesa.nombre.toString().trim());

                invitadosEnMesa.forEach(inv => {
                    asignadosAqui += (1 + inv.acompaniantes);
                });

                let disponible = mesa.capacidad - asignadosAqui;

                tbodyMesas.innerHTML += `
                    <tr>
                        <td>${mesa.nombre}</td>
                        <td>${mesa.capacidad}</td>
                        <td>${asignadosAqui}</td>
                        <td>${disponible <= 0 ? '❌ Lleno' : disponible}</td>
                        <td>
                            <button class="btn" style="padding: 5px 10px; font-size: 0.8em;" onclick="editarMesa('${mesa.nombre}', ${mesa.capacidad})">✏️ Editar</button>
                            <button class="btn" style="padding: 5px 10px; font-size: 0.8em; background-color: #F44336;" onclick="eliminarMesa('${mesa.nombre}')">🗑️ Eliminar</button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderizarAsignacionMesas() {
            let soloConfirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');

            const tbodyAsignacion = document.getElementById('tabla-asignacion-mesas');
            tbodyAsignacion.innerHTML = '';
            soloConfirmados.forEach(inv => {
                let opcionesMesas = `<option value="">-- Seleccionar Mesa --</option>`;
                mesasBD.forEach(m => {
                    let seleccionado = inv.mesaAsignada.toString().trim() === m.nombre.toString().trim() ? 'selected' : '';
                    opcionesMesas += `<option value="${m.nombre}" ${seleccionado}>${m.nombre}</option>`;
                });

                let etiquetaGrupo = "";
                if (inv.familiaManual) {
                    etiquetaGrupo = `<br><span style="background: #e3f2fd; color: #0d47a1; font-size: 0.8em; padding: 2px 6px; border-radius: 4px; font-weight: bold;">👪 Vinculado a: ${inv.familiaManual}</span>`;
                }

                let limpioAcomp = inv.detalleFamilia ? inv.detalleFamilia.trim().toLowerCase() : "";
                let tieneAcompanantesTexto = limpioAcomp !== "" && limpioAcomp !== "-" && limpioAcomp !== "0" && limpioAcomp !== "no" && limpioAcomp !== "ninguno" && limpioAcomp !== "ninguna" && limpioAcomp !== "sin acompañantes";

                if (tieneAcompanantesTexto) {
                    etiquetaGrupo += `<br><small style="color: #777;"><strong>Acompañantes:</strong> ${inv.detalleFamilia}</small>`;
                }

                tbodyAsignacion.innerHTML += `
                    <tr>
                        <td><strong>${inv.nombre}</strong>${etiquetaGrupo}</td>
                        <td>${inv.acompaniantes}</td>
                        <td>
                            <select id="sel-mesa-${inv.filaExcel}">
                                ${opcionesMesas}
                            </select>
                        </td>
                        <td>
                            <button class="btn btn-success" onclick="guardarMesaInvitado(${inv.filaExcel})">Guardar</button>
                        </td>
                    </tr>
                `;
            });
        }
