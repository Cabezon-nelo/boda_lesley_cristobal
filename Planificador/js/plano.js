        // --- PLANO VISUAL DE MESAS (TARJETAS PDF) ---
        function renderizarPlanoMesas() {
            const galeriaMesas = document.getElementById('galeria-mesas');
            if (!galeriaMesas) return;

            let soloConfirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');

            galeriaMesas.innerHTML = '';
            mesasBD.forEach(mesa => {
                let sillasOcupadas = 0;
                let listaNombresHTML = '';
                let invitadosEnMesa = soloConfirmados.filter(inv => inv.mesaAsignada.toString().trim() === mesa.nombre.toString().trim());

                invitadosEnMesa.forEach(inv => {
                    let totalSillasGrupo = 1 + inv.acompaniantes;
                    sillasOcupadas += totalSillasGrupo;
                    let textoAcomp = inv.acompaniantes > 0 ? ` <em>(+${inv.acompaniantes})</em>` : '';

                    let limpioAcomp = inv.detalleFamilia ? inv.detalleFamilia.trim().toLowerCase() : "";
                    let tieneAcompanantesTexto = limpioAcomp !== "" && limpioAcomp !== "-" && limpioAcomp !== "0" && limpioAcomp !== "no" && limpioAcomp !== "ninguno" && limpioAcomp !== "ninguna" && limpioAcomp !== "sin acompañantes";

                    let detalleAcompHTML = tieneAcompanantesTexto ? `<br><small style="color:#666; font-size:0.85em; display:block; padding-left:10px; font-style:italic; font-weight:normal; text-transform:none;">↳ ${inv.detalleFamilia}</small>` : '';

                    listaNombresHTML += `
                        <div class="invitado-item" style="flex-direction: column; align-items: flex-start; border-bottom: 1px dashed #eee; padding: 6px 0;">
                            <div style="display: flex; justify-content: space-between; width: 100%;">
                                <span>${inv.nombre}${textoAcomp}</span>
                                <strong>${totalSillasGrupo} <small>sillas</small></strong>
                            </div>
                            ${detalleAcompHTML}
                        </div>
                    `;
                });

                let sillasLibres = mesa.capacidad - sillasOcupadas;
                let estadoSillasClase = sillasLibres < 0 ? 'sillas-llena' : 'sillas-ok';
                let textoEstadoSillas = sillasLibres < 0 ? `⚠️ Faltan ${Math.abs(sillasLibres)} sillas` : `✓ ${sillasLibres} sillas disponibles`;

                let numeroMesaVisual = mesa.nombre.replace(/[^0-9]/g, '');
                if(!numeroMesaVisual) numeroMesaVisual = mesa.nombre;

                galeriaMesas.innerHTML += `
                    <div class="mesa-card">
                        <h2 class="numero">${numeroMesaVisual}</h2>
                        <h3 class="titulo">Mesa</h3>
                        <div class="novios">Lesley y Cristóbal</div>
                        <div class="fecha">17 / 10 / 2026</div>
                        <div class="lista-invitados">
                            ${listaNombresHTML || '<div style="color:#aaa; text-align:center; padding-top:20px;">Mesa vacía</div>'}
                        </div>
                        <div class="sillas-info ${estadoSillasClase}">
                            Ocupadas: ${sillasOcupadas} / ${mesa.capacidad} <br>
                            ${textoEstadoSillas}
                        </div>
                    </div>
                `;
            });
        }
