import './style.css'


const cvs: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement
const ctx = cvs.getContext("2d") as CanvasRenderingContext2D
let lastMills = 0
let runAfterMills = 0
let SIZE = 85
let PSIZE = 3.5
let MAX_PARTICLES = 20
let OUTER_SIZE = 160

let THEME: "white" | "black" = "black"
let REVERSE_THEME = THEME === "black" ? "white" : "black"

let COLOR: "white" | "black" = THEME === "black" ? "white" : "black"

function changeTheme(newTheme: "white" | "black") {
    THEME = newTheme
    COLOR = THEME === "black" ? "white" : "black"
    REVERSE_THEME = THEME === "black" ? "white" : "black"
}

const inputDiv = document.getElementById("input") as HTMLDivElement
const themeInput = document.getElementById("theme") as HTMLInputElement

const audioInput: HTMLInputElement = document.getElementById("audioInput") as HTMLInputElement;
const saveBtn: HTMLButtonElement = document.getElementById("save") as HTMLButtonElement


let audioCtx: AudioContext

let analyser: AnalyserNode
const audio = new Audio()
let CONNECTED = false
let SAVED = false

function generateAlignedParticles(cos: number, sin: number, initX: number, initY: number, len: number, isFreq = true) {
    let numbeOfParts = Math.floor(len * MAX_PARTICLES / OUTER_SIZE) + 1
    let distance = 4.2
    for (let i = 1; i <= numbeOfParts; i++) {
        let x = (cos * i * 2.5) * distance;
        let y = (sin * i * 2.5) * distance;

        let hue = (150 / i * numbeOfParts) + 105
        let color = isFreq ? `hsl(${hue}, 85%, 75%)` : `hsl(${hue}, 95%, 25%)`

        if (THEME !== "black") {
            color = isFreq ? `hsl(${hue}, 95%, 25%)` : `hsl(${hue}, 85%, 75%)`
        }

        ctx.beginPath()
        ctx.fillStyle = color
        ctx.arc(Math.floor(initX + x), Math.floor(initY + y), PSIZE, 0, 2 * Math.PI)
        ctx.fill()
        ctx.closePath()
    }
}


function init() {


    audioCtx = new AudioContext()
    let source = audioCtx.createMediaElementSource(audio)
    analyser = audioCtx.createAnalyser()
    //analyser.smoothingTimeConstant = .8
    source.connect(analyser)
    analyser.connect(audioCtx.destination)
    CONNECTED = true

    audio.loop = true

    cvs!.width = window.innerWidth * window.devicePixelRatio
    cvs.height = window.innerHeight * window.devicePixelRatio
    // SIZE = (.15 * cvs.width) * window.devicePixelRatio
    // OUTER_SIZE = (.07 * cvs.width) * window.devicePixelRatio

    audioInput!.addEventListener("change", _ => {
        if (!audioInput!.files?.length) return quit()
        let file = audioInput!.files[0]

        if (!audio.canPlayType(file.type)) return quit()

        let fileUrl = window.URL.createObjectURL(file)
        audio.src = fileUrl
        audio.play()
            .then(() => draw())
            .catch(err => {
                console.error(err)
                quit()
            })
    })

    audio.addEventListener("play", () => !SAVED && saveBtn.removeAttribute("disabled"))
    audio.addEventListener("error", () => !audio.src && saveBtn.setAttribute("disabled", "true"))
    audio.addEventListener("play", _ => {
        inputDiv.style.display = "none"
    })
    audio.addEventListener("ended", () => {
        inputDiv.style.display = "block"
    })
    audio.addEventListener("pause", () => {
        inputDiv.style.display = "block"
    })
}

// click space to pause or play
window.addEventListener("keydown", e => {
    if (e.key === " ") {
        if (!audio.paused) audio.pause()
        else {
            audioCtx.state === "running" && audio.play()
        }
    }
})
// create audio context when user focuses the document
window.addEventListener("focusin", () => {
    !CONNECTED && init()
})

// resize canvas
window.addEventListener("resize", () => {
    cvs.width = window.innerWidth * window.devicePixelRatio
    cvs.height = window.innerHeight * window.devicePixelRatio
})

themeInput.addEventListener("change", () => {
    if (THEME === "white") changeTheme("black")
    else changeTheme("white")
})

function quit() {
    alert("Sorry, file type not supported!")
}

let counter = 0
function draw(currentMills = 0) {
    // variables
    analyser.fftSize = 512
    let freqDataArray = new Uint8Array(analyser.frequencyBinCount)
    let timeDataArray = new Uint8Array(analyser.frequencyBinCount)

    analyser.getByteFrequencyData(freqDataArray)
    analyser.getByteTimeDomainData(timeDataArray)
 
    let ch = cvs.height
    let cw = cvs.width
    // let w = cw / freqDataArray.length

    if (COLOR === "black") {
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, cw, ch)
    } else {
        ctx.clearRect(0, 0, cw, ch)
    }


    // handle cancelling
    let diff = currentMills - lastMills;
    let skipFrame = diff < runAfterMills;
    if (skipFrame || audio.paused || !audio.src) {
        return requestAnimationFrame(draw)
    } else {
        lastMills = currentMills
    }

    // handle canvas drawing

    const drawHalfCirle = (dir = -1, dataArray: Uint8Array, isFreq = true) => {

        let initX = (cw / 2)
        let initY = (ch / 2)
        let startAngle = (Math.PI / 2)
        let startX = (initX) + (Math.cos(startAngle) * SIZE)
        let startY = (initY) + (Math.sin(startAngle) * SIZE)
        ctx.moveTo(startX, startY)

        for (let i = 0; i < dataArray.length; i += 8) {
            const f = dataArray[i];
            let angle = dir * i * (
                (Math.PI) / (dataArray.length)
            ) - startAngle

            let cos = Math.cos(angle)
            let sin = Math.sin(angle)

            let initPX = (initX) + (cos * SIZE)
            let initPY = (initY) + (sin * SIZE)

            let freq = ((f * OUTER_SIZE) / 255)

            generateAlignedParticles(cos, sin, initPX, initPY, freq, isFreq)
        }

    }
    // ctx.beginPath()
    //    ctx.moveTo(cw / 2, ch / 2)

    drawHalfCirle(1, timeDataArray, false)
    drawHalfCirle(-1, timeDataArray, false)
    drawHalfCirle(1, freqDataArray)
    drawHalfCirle(-1, freqDataArray)
    // ctx.lineWidth = 2
    // ctx.fillStyle = "#ccc"
    // ctx.fill()
    // ctx.closePath()

    ctx.beginPath()
    ctx.strokeStyle = COLOR
    ctx.arc(cw / 2, ch / 2, SIZE * 2 / 3, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.closePath()
    ctx.beginPath()
    ctx.lineCap = "round"
    ctx.lineWidth = 5
    ctx.strokeStyle = REVERSE_THEME
    ctx.arc(cw / 2, ch / 2, SIZE * 2 / 3, -1 * Math.PI / 2, (audio.currentTime * (2 * Math.PI) / audio.duration) - (Math.PI / 2))
    ctx.stroke()
    ctx.closePath()
    //return requestAnimationFrame(draw) 
    //ctx.lineCap = "round"
    ctx.strokeStyle = REVERSE_THEME
    ctx.lineWidth = 1.2
    ctx.font = "900 30px fantasy, serif"
    let mins = Math.floor(audio.currentTime / 60)
    let secs = Math.floor((audio.currentTime / 60 - mins) * 60)
    let fmins = Math.floor(audio.duration / 60)
    let fsecs = Math.floor((audio.duration / 60 - fmins) * 60)
    let text0 = `${mins}:${secs}`
    let textW0 = ctx.measureText(text0).width
    let text01 = `${fmins}:${fsecs}`
    let textW01 = ctx.measureText(text01).width
    ctx.strokeText(text0, cw / 2 - (textW0 / 2), ch / 2)

    ctx.beginPath()
    ctx.strokeStyle = REVERSE_THEME
    ctx.lineWidth = 5
    ctx.moveTo(cw / 2 - (textW01 / 2), ch / 2 + 10)
    ctx.lineTo(cw / 2 + (textW01 / 2), ch / 2 + 10)
    ctx.stroke()
    ctx.closePath()


    ctx.lineWidth = 1.2
    ctx.strokeText(text01, cw / 2 - (textW01 / 2), ch / 2 + 40)
    ctx.lineWidth = .5
    ctx.font = "20px comics sans ms, serif"
    ctx.strokeStyle = COLOR
    let text = audioInput?.files?.item(0)?.name?.split(".")[0] as string
    let textW = ctx.measureText(text).width
    ctx.strokeText(text, cw / 2 - (textW / 2), ch - 60)
    ctx.fillStyle = COLOR
    ctx.font = "900 12px monospace, sans-serif"
    let text2 = "Valentin, 2022"
    let textW2 = ctx.measureText(text2).width
    ctx.fillText(text2, cw / 2 - (textW2 / 2), ch - 20)

    let num = 200
    let newDiff = num - counter

    if (newDiff < (num * 2 / 3)) {
        ctx.fillStyle = "#aaa"
        ctx.font = "900 13px cursive, serif"
        let text3 = "Press 'SPACE' to PAUSE"
        let textW3 = ctx.measureText(text3).width
        ctx.fillText(text3, cw / 2 - (textW3 / 2), ch - 90)
    }

    if (counter >= num) counter = 0
    counter += 1

    requestAnimationFrame(draw)
}



