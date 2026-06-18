import * as htmlToImage from "https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/+esm"
const chart = document.getElementById("chart")
const settingsToggle = document.getElementById("settingsToggle")
document.getElementById("screenshotButton").addEventListener("click", async () => {
    try {
        if (!chart) throw new Error("Element not found")
        toggleSettings()
        settingsToggle.style.display = "none"
        const options = {
            backgroundColor: null,
            width: data.metadata.chartWidth,
            height: data.metadata.chartHeight,
            cacheBust: true
        }
        const dataURL = await htmlToImage.toPng(chart, options)
        const link = document.createElement("a")
        link.href = dataURL
        link.download = `chart.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        settingsToggle.style.display = "flex"
    } catch (error) {
        console.error("Screenshot failed:", error)
        alert("Screenshot downloading is not supported on this browser. Chrome-based browsers seem to work just fine, so you might wanna try there. Not my fault the modules suck, i'm a Firefox user myself and this pisses me off.")
    }
})