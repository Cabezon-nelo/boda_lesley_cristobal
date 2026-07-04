        // --- ESTADÍSTICAS ---
        function renderizarEstadisticas() {
            document.getElementById('stat-total').innerText = invitadosCotejados.length;
            document.getElementById('stat-si').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si').length;
            document.getElementById('stat-no').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'no').length;
            document.getElementById('stat-pendiente').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'pendiente').length;
        }

        function renderizarGraficoAsistencia() {
            const barra = document.getElementById('barra-asistencia');
            const texto = document.getElementById('texto-asistencia');
            if (!barra || !texto) return;

            let total = invitadosCotejados.length;
            let confirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si').length;
            let porcentaje = total > 0 ? Math.round((confirmados / total) * 100) : 0;

            barra.style.width = porcentaje + '%';
            texto.innerText = `${confirmados} de ${total} invitados confirmados (${porcentaje}%)`;
        }

        function renderizarGraficoMenus() {
            const contenedor = document.getElementById('grafico-menus');
            if (!contenedor) return;

            let confirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');
            let conteoMenus = {};
            confirmados.forEach(inv => {
                let menu = inv.menu && inv.menu !== '-' ? inv.menu : 'Sin especificar';
                conteoMenus[menu] = (conteoMenus[menu] || 0) + 1;
            });

            let nombresMenus = Object.keys(conteoMenus);
            if (nombresMenus.length === 0) {
                contenedor.innerHTML = `<p style="color:#888;">Todavía no hay confirmados para mostrar menús.</p>`;
                return;
            }

            let maximo = Math.max(...nombresMenus.map(menu => conteoMenus[menu]));

            contenedor.innerHTML = nombresMenus.map(menu => {
                let cantidad = conteoMenus[menu];
                let porcentajeAncho = Math.round((cantidad / maximo) * 100);
                return `
                    <div class="barra-item">
                        <div class="barra-item-label"><span>${menu}</span><span>${cantidad}</span></div>
                        <div class="barra-progreso"><div class="barra-progreso-relleno" style="width:${porcentajeAncho}%;"></div></div>
                    </div>
                `;
            }).join('');
        }

        function renderizarGraficoMesasOcupacion() {
            const contenedor = document.getElementById('grafico-mesas-ocupacion');
            if (!contenedor) return;

            if (mesasBD.length === 0) {
                contenedor.innerHTML = `<p style="color:#888;">Todavía no has creado mesas.</p>`;
                return;
            }

            let soloConfirmados = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si');

            contenedor.innerHTML = mesasBD.map(mesa => {
                let invitadosEnMesa = soloConfirmados.filter(inv => inv.mesaAsignada.toString().trim() === mesa.nombre.toString().trim());
                let ocupadas = invitadosEnMesa.reduce((total, inv) => total + 1 + inv.acompaniantes, 0);
                let porcentaje = mesa.capacidad > 0 ? Math.min(100, Math.round((ocupadas / mesa.capacidad) * 100)) : 0;

                return `
                    <div class="barra-item">
                        <div class="barra-item-label"><span>${mesa.nombre}</span><span>${ocupadas}/${mesa.capacidad}</span></div>
                        <div class="barra-progreso"><div class="barra-progreso-relleno" style="width:${porcentaje}%;"></div></div>
                    </div>
                `;
            }).join('');
        }
