        // --- INVITADOS: CARGA MASIVA Y LISTA GENERAL (agrupada por familia) ---
        async function agregarInvitadosMasivo() {
            const textarea = document.getElementById('inv-masivo').value;
            if (!textarea.trim()) return alert("Por favor ingresa nombres.");

            const nombresArray = textarea.split('\n').map(n => n.trim()).filter(n => n !== "");
            const btn = document.querySelector('button[onclick="agregarInvitadosMasivo()"]');
            btn.innerText = "Cargando... ⏳";
            btn.disabled = true;

            try {
                await fetch(URL_GOOGLE_SCRIPT, {
                    method: 'POST',
                    body: JSON.stringify({ accion: 'cargar_masivo', nombres: nombresArray })
                });
                document.getElementById('inv-masivo').value = '';
                alert(`¡Carga masiva lista! Se agregaron ${nombresArray.length} invitados.`);
                await cargarDatosDesdeExcel();
            } catch (e) {
                alert("Error en la carga masiva.");
            } finally {
                btn.innerText = "Cargar Lista";
                btn.disabled = false;
            }
        }

        // La agrupación ya viene resuelta desde realizarCotejo() en estructuraFamilias / invitadosIndividuales;
        // aquí solo se pinta.
        function renderizarListaInvitados() {
            const tbodyLista = document.getElementById('tabla-lista-oficial');
            tbodyLista.innerHTML = '';

            Object.keys(estructuraFamilias).forEach(nombreFamilia => {
                let integrantes = estructuraFamilias[nombreFamilia].integrantes;
                let filasIntegrantes = integrantes.map(inv => generarFilaInvitado(inv)).join('');

                tbodyLista.innerHTML += `
                    <tr>
                        <td colspan="4" style="padding: 0; border-bottom: none;">
                            <details style="margin: 12px 0; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                                <summary style="cursor: pointer; padding: 12px 15px; background: #fafafa; font-weight: bold;">
                                    👪 ${nombreFamilia}
                                    <span style="font-weight: normal; font-size: 0.85em; color: #666; margin-left: 8px;">${generarResumenFamilia(integrantes)}</span>
                                </summary>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tbody>${filasIntegrantes}</tbody>
                                </table>
                            </details>
                        </td>
                    </tr>
                `;
            });

            invitadosIndividuales.forEach(inv => {
                tbodyLista.innerHTML += generarFilaInvitado(inv);
            });
        }
