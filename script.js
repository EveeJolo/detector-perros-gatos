// ============================================================
// CONFIGURACIÓN
// ============================================================

const URL = "https://teachablemachine.withgoogle.com/models/JJuE5peJ5/";

let modelo;
let webcam;

let ejecutando = false;
let analizando = false;


// ============================================================
// ARDUINO
// ============================================================

let puertoArduino = null;
let animalElegido = null;


// ============================================================
// CONECTAR ARDUINO
// ============================================================

async function conectarArduino() {

    if (!("serial" in navigator)) {

        alert(
            "Tu navegador no soporta comunicación directa con Arduino. " +
            "Usá Google Chrome o Microsoft Edge."
        );

        return;
    }

    try {

        puertoArduino =
            await navigator.serial.requestPort();

        await puertoArduino.open({
            baudRate: 9600
        });

        alert("Arduino conectado correctamente.");

        escucharArduino();

    } catch (error) {

        console.error(error);

        alert("No se pudo conectar con Arduino.");
    }
}


// ============================================================
// ESCUCHAR ARDUINO
// ============================================================

async function escucharArduino() {

    if (!puertoArduino.readable) {
        return;
    }

    const lector =
        puertoArduino.readable
            .pipeThrough(new TextDecoderStream())
            .getReader();

    let texto = "";

    try {

        while (true) {

            const { value, done } =
                await lector.read();

            if (done) {
                break;
            }

            texto += value;

            const lineas =
                texto.split("\n");

            texto = lineas.pop();

            for (const linea of lineas) {

                const mensaje =
                    linea.trim();

                console.log(
                    "Arduino:",
                    mensaje
                );


                // ============================================
                // BOTÓN PERRO
                // ============================================

                if (mensaje === "PERRO") {

                    animalElegido = "perro";

                    console.log(
                        "El niño eligió PERRO"
                    );

                    comenzarAnalisis();
                }


                // ============================================
                // BOTÓN GATO
                // ============================================

                if (mensaje === "GATO") {

                    animalElegido = "gato";

                    console.log(
                        "El niño eligió GATO"
                    );

                    comenzarAnalisis();
                }
            }
        }

    } catch (error) {

        console.error(
            "Error leyendo Arduino:",
            error
        );

    } finally {

        lector.releaseLock();
    }
}


// ============================================================
// ENVIAR PORCENTAJE A ARDUINO
// ============================================================

async function enviarPorcentaje(porcentaje) {

    if (
        !puertoArduino ||
        !puertoArduino.writable
    ) {

        console.log(
            "Arduino no conectado. No se envió el porcentaje."
        );

        return;
    }


    const escritor =
        puertoArduino.writable.getWriter();


    try {

        const texto =
            Math.round(porcentaje) + "\n";

        await escritor.write(
            new TextEncoder().encode(texto)
        );

        console.log(
            "Enviado a Arduino:",
            texto
        );

    } finally {

        escritor.releaseLock();
    }
}


// ============================================================
// INICIAR CÁMARA
// ============================================================

async function iniciar() {

    const resultado =
        document.getElementById("resultado");

    resultado.innerText =
        "Cargando modelo...";


    const modelURL =
        URL + "model.json";

    const metadataURL =
        URL + "metadata.json";


    // Cargar modelo de Teachable Machine
    modelo = await tmImage.load(
        modelURL,
        metadataURL
    );


    // Tamaño de la cámara
    const tamaño = 400;


    webcam = new tmImage.Webcam(
        tamaño,
        tamaño,
        true
    );


    await webcam.setup();
    await webcam.play();


    document
        .getElementById("webcam-container")
        .appendChild(
            webcam.canvas
        );


    ejecutando = true;


    resultado.innerText =
        "¡Listo!";


    actualizar();
}


// ============================================================
// ACTUALIZAR CÁMARA
// ============================================================

async function actualizar() {

    if (!ejecutando) {
        return;
    }

    webcam.update();

    window.requestAnimationFrame(
        actualizar
    );
}


// ============================================================
// COMENZAR ANÁLISIS
// ============================================================

function comenzarAnalisis() {

    // La cámara tiene que estar iniciada
    if (!ejecutando) {

        alert(
            "Primero tenés que iniciar la cámara."
        );

        return;
    }


    // Evitar dos análisis al mismo tiempo
    if (analizando) {

        return;
    }


    analizando = true;


    const resultado =
        document.getElementById(
            "resultado"
        );

    const marco =
        document.getElementById(
            "webcam-container"
        );


    // Mostrar mensaje
    if (animalElegido === "perro") {

        resultado.innerText =
            "🐶 Analizando tu perro...";

    }
    else if (animalElegido === "gato") {

        resultado.innerText =
            "🐱 Analizando tu gato...";

    }
    else {

        resultado.innerText =
            "🤖 Analizando...";
    }


    // Activar efecto rojo
    marco.classList.add(
        "analizando"
    );


    // Analizar durante 3 segundos
    analizarDuranteTresSegundos();
}


// ============================================================
// ANALIZAR DURANTE 3 SEGUNDOS
// ============================================================

async function analizarDuranteTresSegundos() {

    let sumaPerro = 0;
    let sumaGato = 0;

    let cantidadMuestras = 0;

    const inicio = Date.now();


    while (
        Date.now() - inicio < 3000
    ) {

        const predicciones =
            await modelo.predict(
                webcam.canvas
            );


        let perro = 0;
        let gato = 0;


        for (
            let i = 0;
            i < predicciones.length;
            i++
        ) {

            const clase =
                predicciones[i]
                    .className
                    .toLowerCase();


            const porcentaje =
                predicciones[i]
                    .probability;


            if (clase === "perro") {

                perro =
                    porcentaje;
            }


            if (clase === "gato") {

                gato =
                    porcentaje;
            }
        }


        // Acumular resultados
        sumaPerro += perro;
        sumaGato += gato;

        cantidadMuestras++;


        // Pequeña pausa entre muestras
        await new Promise(
            resolver =>
                setTimeout(
                    resolver,
                    50
                )
        );
    }


    // Calcular promedio
    const perroFinal =
        sumaPerro /
        cantidadMuestras;


    const gatoFinal =
        sumaGato /
        cantidadMuestras;


    mostrarResultado(
        perroFinal,
        gatoFinal
    );
}


// ============================================================
// MOSTRAR RESULTADO FINAL
// ============================================================

async function mostrarResultado(
    perro,
    gato
) {

    analizando = false;


    const resultado =
        document.getElementById(
            "resultado"
        );


    const marco =
        document.getElementById(
            "webcam-container"
        );


    // Quitar efecto rojo
    marco.classList.remove(
        "analizando"
    );


    // Mostrar porcentajes
    document
        .getElementById(
            "probabilidades"
        )
        .style.visibility =
        "visible";


    document
        .getElementById("perro")
        .innerText =
        Math.round(
            perro * 100
        ) + "%";


    document
        .getElementById("gato")
        .innerText =
        Math.round(
            gato * 100
        ) + "%";


    // ========================================================
    // RESULTADO VISUAL
    // ========================================================

    if (perro > gato) {

        resultado.innerText =
            "🐶 ¡Creo que es un PERRO!";

    }
    else {

        resultado.innerText =
            "🐱 ¡Creo que es un GATO!";
    }


    // ========================================================
    // ENVIAR PORCENTAJE A ARDUINO
    // ========================================================

    // Si el niño eligió PERRO,
    // enviamos el porcentaje de PERRO.

    if (animalElegido === "perro") {

        await enviarPorcentaje(
            perro * 100
        );
    }


    // Si el niño eligió GATO,
    // enviamos el porcentaje de GATO.

    else if (animalElegido === "gato") {

        await enviarPorcentaje(
            gato * 100
        );
    }


    // Preparar para el siguiente dibujo
    animalElegido = null;
}