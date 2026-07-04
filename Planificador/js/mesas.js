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

        // Mueve a una familia completa (todas sus filas confirmadas) o a un invitado individual
        // a otra mesa, apenas se elige en el selector — sin botón "Guardar" aparte.
        async function moverGrupoAMesa(tipo, identificador, mesaDestino, selectElemento) {
            let filas = [];
            if (tipo === 'familia') {
                let integrantes = estructuraFamilias[identificador] ? estructuraFamilias[identificador].integrantes : [];
                filas = integrantes
                    .filter(inv => inv.estado.toLowerCase() === 'sí' || inv.estado.toLowerCase() === 'si')
                    .map(inv => inv.filaExcel)
                    .filter(fila => fila);
            } else {
                filas = [identificador];
            }

            if (filas.length === 0) return;

            selectElemento.disabled = true;

            try {
                for (const fila of filas) {
                    await fetch(URL_GOOGLE_SCRIPT, {
                        method: 'POST',
                        body: JSON.stringify({ accion: 'asignar_mesa', fila: fila, nuevaMesa: mesaDestino })
                    });
                }
                await cargarDatosDesdeExcel();
            } catch (e) {
                alert("No se pudo mover a la mesa seleccionada.");
                selectElemento.disabled = false;
            }
        }

        // --- RENDER: MESAS (tarjetas visuales, Módulo 3) ---
        function generarSelectMoverMesa(tipo, identificador, mesaActual) {
            let opciones = mesaActual
                ? `<option value="">-- Mover a --</option>`
                : `<option value="">-- Elegir mesa --</option>`;

            mesasBD.forEach(m => {
                if (mesaActual && m.nombre.toString().trim() === mesaActual.toString().trim()) return;
                opciones += `<option value="${m.nombre}">${m.nombre}</option>`;
            });

            return `
                <select onchange="if(this.value) moverGrupoAMesa('${tipo}', '${identificador}', this.value, this)">
                    ${opciones}
                </select>
            `;
        }

        function generarFilasIntegrantesMesa(invitadosEnMesa, mesaActual) {
            let familiasEnMesa = {};
            let individualesEnMesa = [];

            invitadosEnMesa.forEach(inv => {
                if (inv.familiaManual) {
                    if (!familiasEnMesa[inv.familiaManual]) familiasEnMesa[inv.familiaManual] = [];
                    familiasEnMesa[inv.familiaManual].push(inv);
                } else {
                    individualesEnMesa.push(inv);
                }
            });

            let filasHTML = '';

            Object.keys(familiasEnMesa).forEach(nombreFamilia => {
                let integrantes = familiasEnMesa[nombreFamilia];
                let sillas = integrantes.reduce((total, inv) => total + 1 + inv.acompaniantes, 0);
                filasHTML += `
                    <div class="mesa-integrante-fila">
                        <span>👪 ${nombreFamilia} <small>(${sillas} sillas)</small></span>
                        ${generarSelectMoverMesa('familia', nombreFamilia, mesaActual)}
                    </div>
                `;
            });

            individualesEnMesa.forEach(inv => {
                let sillas = 1 + inv.acompaniantes;
                filasHTML += `
                    <div class="mesa-integrante-fila">
                        <span>${inv.nombre} <small>(${sillas} sillas)</small></span>
                        ${generarSelectMoverMesa('individual', inv.filaExcel, mesaActual)}
                    </div>
                `;
            });

            return filasHTML;
        }

        function renderizarMesasVisual() {
            const contenedor = document.getElementById('mesas-visual-contenedor');
            if (!contenedor) return;
            contenedor.innerHTML = '';

            let soloConfirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');

            mesasBD.forEach(mesa => {
                let invitadosEnMesa = soloConfirmados.filter(inv => inv.mesaAsignada.toString().trim() === mesa.nombre.toString().trim());
                let sillasOcupadas = invitadosEnMesa.reduce((total, inv) => total + 1 + inv.acompaniantes, 0);

                contenedor.innerHTML += `
                    <div class="mesa-tarjeta">
                        <div class="mesa-tarjeta-header">
                            <strong>${mesa.nombre} — ${sillasOcupadas}/${mesa.capacidad} personas</strong>
                            <div>
                                <button class="btn" style="padding: 5px 10px; font-size: 0.8em;" onclick="editarMesa('${mesa.nombre}', ${mesa.capacidad})">✏️ Editar</button>
                                <button class="btn" style="padding: 5px 10px; font-size: 0.8em; background-color: #F44336;" onclick="eliminarMesa('${mesa.nombre}')">🗑️ Eliminar</button>
                            </div>
                        </div>
                        <div class="mesa-integrantes">
                            ${generarFilasIntegrantesMesa(invitadosEnMesa, mesa.nombre) || '<p style="color:#aaa;">Mesa vacía</p>'}
                        </div>
                    </div>
                `;
            });

            let sinAsignar = soloConfirmados.filter(inv => !inv.mesaAsignada || inv.mesaAsignada.toString().trim() === '');
            if (sinAsignar.length > 0) {
                let sillasSinAsignar = sinAsignar.reduce((total, inv) => total + 1 + inv.acompaniantes, 0);
                contenedor.innerHTML += `
                    <div class="mesa-tarjeta mesa-sin-asignar">
                        <div class="mesa-tarjeta-header">
                            <strong>Sin asignar — ${sillasSinAsignar} personas</strong>
                        </div>
                        <div class="mesa-integrantes">
                            ${generarFilasIntegrantesMesa(sinAsignar, null)}
                        </div>
                    </div>
                `;
            }
        }
