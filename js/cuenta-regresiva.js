const fechaMatrimonio = new Date("Oct 17, 2026 17:30:00").getTime();
    setInterval(function () {
        const ahora = new Date().getTime();
        const distancia = fechaMatrimonio - ahora;
        const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((distancia % (1000 * 60)) / 1000);
        document.getElementById("dias").textContent = dias;
        document.getElementById("horas").textContent = horas;
        document.getElementById("minutos").textContent = minutos;
        document.getElementById("segundos").textContent = segundos;
        if (distancia < 0) {
            document.querySelector(".countdown-wrapper").innerHTML =
                "<h2>¡Hoy es nuestro gran día!</h2>";
        }
    },1000);
