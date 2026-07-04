        // --- ESTADÍSTICAS ---
        function renderizarEstadisticas() {
            document.getElementById('stat-total').innerText = invitadosCotejados.length;
            document.getElementById('stat-si').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'sí' || i.estado.toLowerCase() === 'si').length;
            document.getElementById('stat-no').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'no').length;
            document.getElementById('stat-pendiente').innerText = invitadosCotejados.filter(i => i.estado.toLowerCase() === 'pendiente').length;
        }
