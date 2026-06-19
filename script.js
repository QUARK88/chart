const STORAGE_KEY = "chart_data"
const warning = document.getElementById("warning")
const chart = document.getElementById("chart")
const settings = document.getElementById("settings")
const settingsToggle = document.getElementById("settingsToggle")
const nodesContainer = document.getElementById("nodes")
const arrowsContainer = document.getElementById("arrows")
const menu = document.getElementById("menu")
const menuNameInput = menu.querySelector("input[placeholder='Node name']")
const menuHyperlinkInput = menu.querySelector("input[placeholder='Node hyperlink']")
const menuPrecursorsContainer = document.getElementById("menuPrecursors")
const menuColorsContainer = document.getElementById("menuColors")
const widthPicker = document.getElementById("widthPicker")
const heightPicker = document.getElementById("heightPicker")
const colorEditor = document.getElementById("colorEditor")
const undoStack = []
const redoStack = []
const MAX_HISTORY = 100
function cloneNodes() {
    return JSON.parse(
        JSON.stringify(data.nodes)
    )
}
function pushHistory() {
    undoStack.push(cloneNodes())
    if (undoStack.length > MAX_HISTORY) { undoStack.shift() }
    redoStack.length = 0
}
function applyNodeState(nodes) {
    data.nodes = nodes
    saveData()
    renderNodes()
    renderArrows()
    refreshNodeNames()
}
function undo() {
    if (!undoStack.length)
        return
    redoStack.push(cloneNodes())
    applyNodeState(undoStack.pop())
}
function redo() {
    if (!redoStack.length)
        return
    undoStack.push(cloneNodes())
    applyNodeState(redoStack.pop())
}
document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault()
        undo()
    }
    if (event.ctrlKey && event.key.toLowerCase() === "y") {
        event.preventDefault()
        redo()
    }
}
)
function createDefaultData() {
    return {
        metadata: {
            chartWidth: 2000,
            chartHeight: 2000,
            fontFamily: "expressway",
            fontSize: 16,
            gridGranularity: 25,
            colors: [
                "#808080",
                "#808080",
                "#808080",
                "#808080",
                "#808080",
                "#808080",
                "#c02040",
                "#e06020",
                "#e0a000",
                "#40a060",
                "#0060c0",
                "#8060c0"
            ]
        },
        nodes: {}
    }
}
let data = createDefaultData()
let draggedNode = null
let draggedNodeName = null
let dragOffsetX = 0
let dragOffsetY = 0
let editingNodeName = null
let pendingNodePosition = null
function snap(value) {
    const grid = data.metadata.gridGranularity
    return (grid * Math.round(value / grid))
}
const fontSizeInput = document.getElementById("fontSize")
const gridGranularityInput = document.getElementById("gridGranularity")
function setFont(family) {
    data.metadata.fontFamily = family || "expressway"
    applySettings()
    saveData()
    toggleSettings()
}
function applySettings() {
    document.documentElement.style.setProperty("--fontSize", `${data.metadata.fontSize}px`)
    document.documentElement.style.setProperty("--gridGranularity", `${data.metadata.gridGranularity}px`)
    document.documentElement.style.setProperty("--fontFamily", data.metadata.fontFamily)
    chart.style.width = `${data.metadata.chartWidth}px`
    chart.style.height = `${data.metadata.chartHeight}px`
    widthPicker.value = data.metadata.chartWidth
    heightPicker.value = data.metadata.chartHeight
}
function saveData() {
    data.metadata.chartWidth = parseInt(widthPicker.value)
    data.metadata.chartHeight = parseInt(heightPicker.value)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored)
        return
    try {
        data = JSON.parse(stored)
    } catch {
        console.error("Failed to load data")
    }
}
loadData()
widthPicker.value = data.metadata.chartWidth
heightPicker.value = data.metadata.chartHeight
widthPicker.addEventListener("input", () => {
    data.metadata.chartWidth = parseInt(widthPicker.value) || 2000
    chart.style.width = `${data.metadata.chartWidth}px`
    saveData()
})
heightPicker.addEventListener("input", () => {
    data.metadata.chartHeight = parseInt(heightPicker.value) || 2000
    chart.style.height = `${data.metadata.chartHeight}px`
    saveData()
})
fontSizeInput.value = data.metadata.fontSize
gridGranularityInput.value = data.metadata.gridGranularity
applySettings()
fontSizeInput.addEventListener("input", () => {
    data.metadata.fontSize = parseFloat(fontSizeInput.value)
    applySettings()
    saveData()
})
gridGranularityInput.addEventListener("input", () => {
    data.metadata.gridGranularity = parseInt(gridGranularityInput.value)
    applySettings()
    saveData()
})
function initializeDisplay() {
    warning.style.display = "none"
    chart.style.display = "flex"
    settings.style.display = "none"
}
function toggleSettings() {
    settings.style.display = chart.style.display === "flex" ? "flex" : "none"
    settingsToggle.innerHTML = chart.style.display === "flex" ? "See chart" : "See settings"
    chart.style.display = chart.style.display === "flex" ? "none" : "flex"
    document.documentElement.scrollTop = 0
}
function toggleGridBackground() {
    chart.classList.toggle("gridBackground")
    toggleSettings()
}
function getNode(name) {
    return data.nodes[name]
}
function createNodeElement(name, nodeData) {
    const node = document.createElement("div")
    node.className = "node"
    node.dataset.name = name
    node.style.left = `${nodeData.x}px`
    node.style.top = `${nodeData.y}px`
    const text = document.createElement("a")
    text.className = "nodeText"
    text.textContent = name
    if (name.length >= 32) {
        text.style.width = "calc(var(--fontSize)*13)"
    }
    text.draggable = false
    /*if (nodeData.hyperlink) {
        text.href = nodeData.hyperlink
        text.target = "_blank"
    }*/
    const shape = document.createElement("a")
    shape.className = "nodeShape"
    shape.draggable = false
    /*if (nodeData.hyperlink) {
        shape.href = nodeData.hyperlink
        shape.target = "_blank"
    }*/
    shape.style.backgroundColor = data.metadata.colors[nodeData.color] || "#808080"
    if (nodeData.type === 0)
        shape.classList.add("nodeIdeology")
    if (nodeData.type === 1)
        shape.classList.add("nodeFaction")
    if (nodeData.type === 2)
        shape.classList.add("nodeCurrent")
    node.appendChild(text)
    node.appendChild(shape)
    node.addEventListener("mousedown", (event) => { if (event.button === 0) { startDragging(event) } })
    node.addEventListener("contextmenu", openNodeMenu)
    return node
}
function renderNodes() {
    nodesContainer.innerHTML = ""
    const sortedNames = Object.keys(data.nodes).sort((a, b) =>
        a.localeCompare(b)
    )
    for (const name of sortedNames) {
        const node = createNodeElement(name, data.nodes[name])
        nodesContainer.appendChild(node)
    }
    renderArrows()
}
function createPrecursorInput(value = "") {
    const input = document.createElement("input")
    input.placeholder = "Precursor node"
    input.value = value
    input.setAttribute("list", "nodeNames")
    input.addEventListener("input", () => {
        const inputs = [...menuPrecursors.querySelectorAll("input")]
        if (input === inputs[inputs.length - 1] && input.value.trim()) {
            menuPrecursors.appendChild(createPrecursorInput())
        }
    })
    return input
}
function refreshPrecursorsEditor(precursors = []) {
    menuPrecursors.innerHTML = ""
    precursors.forEach(precursor => {
        menuPrecursors.appendChild(createPrecursorInput(precursor))
    })
    menuPrecursors.appendChild(createPrecursorInput())
}
function createNode(name, x, y) {
    pushHistory()
    data.nodes[name] = { x, y, type: 0, color: 0, hyperlink: "", precursors: [] }
    saveData()
    renderNodes()
    refreshNodeNames()
}
function renameNode(oldName, newName) {
    pushHistory()
    if (oldName === newName)
        return
    const node = data.nodes[oldName]
    delete data.nodes[oldName]
    data.nodes[newName] = node
    for (const otherNode of Object.values(data.nodes)) {
        otherNode.precursors = otherNode.precursors.map(precursor => precursor === oldName ? newName : precursor)
    }
    refreshNodeNames()
}
function deleteNode(name) {
    pushHistory()
    delete data.nodes[name]
    for (const node of Object.values(data.nodes)) {
        node.precursors = node.precursors.filter(precursor => precursor !== name)
    }
    saveData()
    renderNodes()
    refreshNodeNames()
}
function startDragging(event) {
    pushHistory()
    if (event.button !== 0)
        return
    event.preventDefault()
    draggedNode = event.currentTarget
    draggedNodeName = draggedNode.dataset.name
    const rect = draggedNode.getBoundingClientRect()
    dragOffsetX = event.clientX - rect.left
    dragOffsetY = event.clientY - rect.top
}
document.addEventListener("mousemove", event => {
    if (!draggedNode)
        return
    closeMenu()
    const chartRect = chart.getBoundingClientRect()
    const x = snap(event.clientX - chartRect.left - dragOffsetX)
    const y = snap(event.clientY - chartRect.top - dragOffsetY)
    draggedNode.style.left = `${x}px`
    draggedNode.style.top = `${y}px`
    const node = getNode(draggedNodeName)
    node.x = x
    node.y = y
    renderArrows()
})
document.addEventListener("mouseup", () => {
    if (!draggedNode)
        return
    saveData()
    draggedNode = null
    draggedNodeName = null
})
document.addEventListener("keydown", event => {
    if (menu.style.display !== "flex")
        return
    if (event.key === "Escape") {
        if (colorPopup.style.display !== "none") {
            colorPopup.style.display = "none"
            return
        }
        closeMenu()
        return
    }
    if (event.key === "Enter") {
        if (colorPopup.style.display !== "none") {
            event.preventDefault()
            colorPopup.style.display = "none"
            return
        }
        if (document.activeElement.tagName === "TEXTAREA")
            return
        event.preventDefault()
        saveButton.click()
    }
})
warning.style.display = "flex"
chart.style.display = "none"
settings.style.display = "none"
let selectedType = 0
let selectedColor = 0
const typeButtons = Array.from(
    menu.querySelectorAll(".menuGrid")[0].querySelectorAll("button")
)
const actionButtons = Array.from(
    menu.querySelectorAll(".menuGrid")[1].querySelectorAll("button")
)
const deleteButton = actionButtons[0]
const cancelButton = actionButtons[1]
const saveButton = actionButtons[2]
function closeMenu() {
    menu.style.display = "none"
    editingNodeName = null
    pendingNodePosition = null
    menuNameInput.blur()
    menuHyperlinkInput.blur()
}
function openMenu(x, y) {
    menu.style.display = "flex"
    const margin = 25
    const menuWidth = menu.offsetWidth
    const menuHeight = menu.offsetHeight
    const maxX = window.scrollX + window.innerWidth - menuWidth - margin
    const maxY = window.scrollY + window.innerHeight - menuHeight - margin
    menu.style.left = `${Math.min(x + 25, maxX)}px`
    menu.style.top = `${Math.min(y + 25, maxY)}px`
    menuNameInput.focus()
    menuNameInput.select()
}
function updateTypeButtons() {
    typeButtons.forEach((button, index) => { button.classList.toggle("selectedButton", index === selectedType) })
}
function updateColorButtons() {
    Array.from(menuColorsContainer.children).forEach((div, index) => {
        div.style.border = index === selectedColor ? "2px solid var(--textShadow)" : "none"
    })
}
function buildColorButtons() {
    menuColorsContainer.innerHTML = ""
    data.metadata.colors.forEach(
        (color, index) => {
            const div = document.createElement("div")
            div.className = "colorDiv"
            div.style.backgroundColor = color
            div.addEventListener("click", () => {
                selectedColor = index
                updateColorButtons()
            })
            div.addEventListener("contextmenu", event => {
                event.preventDefault()
                event.stopPropagation()
                colorPopup.innerHTML = ""
                const settingColor = document.createElement("div")
                settingColor.classList.add("settingColor")
                const settingColorPicker = document.createElement("input")
                settingColorPicker.classList.add("settingColorPicker")
                settingColorPicker.type = "color"
                settingColorPicker.value = data.metadata.colors[index]
                const settingColorText = document.createElement("input")
                settingColorText.classList.add("settingColorText")
                settingColorText.type = "text"
                settingColorText.value = data.metadata.colors[index]
                function applyColor(value) {
                    data.metadata.colors[index] = value
                    updateNodeColors()
                    buildColorButtons()
                    buildSettingsColors()
                    renderArrows()
                    saveData()
                }
                settingColorPicker.addEventListener("input", () => {
                    settingColorText.value = settingColorPicker.value
                    applyColor(settingColorPicker.value)
                })
                settingColorText.addEventListener("change", () => {
                    settingColorPicker.value = settingColorText.value
                    applyColor(settingColorText.value)
                })
                settingColor.appendChild(settingColorPicker)
                settingColor.appendChild(settingColorText)
                colorPopup.appendChild(settingColor)
                colorPopup.style.left = `${event.clientX}px`
                colorPopup.style.top = `${event.clientY}px`
                colorPopup.style.display = "block"
            })
            menuColorsContainer.appendChild(div)
        }
    )
}
function openNewNodeMenu(x, y) {
    editingNodeName = null
    pendingNodePosition = { x, y }
    selectedType = 0
    selectedColor = 0
    menuNameInput.value = ""
    menuHyperlinkInput.value = ""
    updateTypeButtons()
    updateColorButtons()
    refreshPrecursorsEditor([])
    openMenu(x, y)
}
function openExistingNodeMenu(name, x, y) {
    const node = data.nodes[name]
    editingNodeName = name
    pendingNodePosition = { x: node.x, y: node.y }
    selectedType = node.type
    selectedColor = node.color
    menuNameInput.value = name
    menuHyperlinkInput.value = node.hyperlink
    updateTypeButtons()
    updateColorButtons()
    refreshPrecursorsEditor(node.precursors)
    openMenu(x, y)
}
function openNodeMenu(event) {
    event.preventDefault()
    const nodeElement = event.currentTarget
    openExistingNodeMenu(nodeElement.dataset.name, event.clientX, event.clientY)
}
chart.addEventListener("contextmenu", event => {
    if (event.target.closest(".node"))
        return
    event.preventDefault()
    const chartRect = chart.getBoundingClientRect()
    const x = snap(event.clientX - chartRect.left)
    const y = snap(event.clientY - chartRect.top)
    openNewNodeMenu(event.clientX, event.clientY)
    pendingNodePosition = { x, y }
})
typeButtons.forEach(
    (button, index) => {
        button.addEventListener("click", () => {
            selectedType = index
            updateTypeButtons()
        })
    }
)
deleteButton.addEventListener("click", () => {
    if (!editingNodeName)
        return
    deleteNode(editingNodeName)
    closeMenu()
})
cancelButton.addEventListener("click", () => { closeMenu() })
saveButton.addEventListener("click", () => {
    const name = menuNameInput.value.trim()
    const precursors = [...menuPrecursors.querySelectorAll("input")].map(input => input.value.trim()).filter(Boolean)
    if (!name) {
        alert("Node name is required")
        return
    }
    if (editingNodeName === null) {
        if (data.nodes[name]) {
            alert("A node with that name already exists")
            return
        }
        createNode(name, pendingNodePosition.x, pendingNodePosition.y)
        const node = data.nodes[name]
        node.type = selectedType
        node.color = selectedColor
        node.hyperlink = menuHyperlinkInput.value.trim()
        node.precursors = precursors
        saveData()
        renderNodes()
    } else {
        if (name !== editingNodeName && data.nodes[name]
        ) {
            alert("A node with that name already exists")
            return
        }
        const node = data.nodes[editingNodeName]
        renameNode(editingNodeName, name)
        const renamed = data.nodes[name]
        renamed.type = selectedType
        renamed.color = selectedColor
        renamed.hyperlink = menuHyperlinkInput.value.trim()
        renamed.precursors = precursors
        saveData()
        renderNodes()
    }
    closeMenu()
})
document.addEventListener("mousedown", event => {
    if (menu.style.display !== "flex")
        return
    if (event.target.closest("#menu"))
        return
    if (event.target.closest("#colorPopup"))
        return
    closeMenu()
})
function buildSettingsColors() {
    settingsColors.innerHTML = ""
    data.metadata.colors.forEach(
        (color, index) => {
            const settingColor = document.createElement("div")
            settingColor.classList.add("settingColor")
            const settingColorPicker = document.createElement("input")
            settingColorPicker.classList.add("settingColorPicker")
            settingColorPicker.type = "color"
            settingColorPicker.value = color
            settingColorPicker.addEventListener("input", () => {
                data.metadata.colors[index] = settingColorPicker.value
                updateNodeColors()
                buildColorButtons()
                buildSettingsColors()
                saveData()
            })
            settingColor.appendChild(settingColorPicker)
            const settingColorText = document.createElement("input")
            settingColorText.classList.add("settingColorText")
            settingColorText.type = "text"
            settingColorText.value = color
            settingColorText.addEventListener("change", () => {
                data.metadata.colors[index] = settingColorText.value
                updateNodeColors()
                buildColorButtons()
                buildSettingsColors()
                saveData()
            })
            settingColor.appendChild(settingColorText)
            settingsColors.appendChild(settingColor)
        }
    )
}
function updateNodeColors() {
    document.querySelectorAll(".node").forEach(nodeElement => {
        const name = nodeElement.dataset.name
        const node = data.nodes[name]
        const shape = nodeElement.querySelector(".nodeShape")
        shape.style.backgroundColor = data.metadata.colors[node.color]
    })
    renderArrows()
}
function renderArrows() {
    arrows.innerHTML = ""
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.style.position = "absolute"
    svg.style.left = "0"
    svg.style.top = "0"
    svg.style.width = chart.style.width
    svg.style.height = chart.style.height
    arrows.appendChild(svg)
    Object.entries(data.nodes).forEach(
        ([name, node]) => {
            node.precursors.forEach(precursorEntry => {
                const parts = precursorEntry.split(";")
                const precursorName = parts[0].trim()
                const arrowText = parts.slice(1).join(";").trim()
                const precursor = data.nodes[precursorName]
                if (!precursor)
                    return
                const x1 = precursor.x
                const y1 = precursor.y
                const x2 = node.x
                const y2 = node.y
                const color = data.metadata.colors[node.color]
                const path = document.createElementNS("http://www.w3.org/2000/svg", "line")
                const dx = x2 - x1
                const dy = y2 - y1
                const angle = Math.atan2(dy, dx)
                let borderDistance
                if (node.type === 0) { borderDistance = 20 } else if (node.type === 1) {
                    borderDistance = 20 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)))
                } else {
                    const localAngle = angle - Math.PI / 4
                    borderDistance = 20 / Math.max(Math.abs(Math.cos(localAngle)), Math.abs(Math.sin(localAngle)))
                }
                const tipX = x2 - borderDistance * Math.cos(angle)
                const tipY = y2 - borderDistance * Math.sin(angle)
                path.setAttribute("x1", x1)
                path.setAttribute("y1", y1)
                path.setAttribute("x2", tipX)
                path.setAttribute("y2", tipY)
                path.setAttribute("stroke", color)
                path.setAttribute("stroke-width", "2")
                svg.appendChild(path)
                const headLength = 24
                const headWidth = 5
                const leftX = tipX - headLength * Math.cos(angle) + headWidth * Math.sin(angle)
                const leftY = tipY - headLength * Math.sin(angle) - headWidth * Math.cos(angle)
                const rightX = tipX - headLength * Math.cos(angle) - headWidth * Math.sin(angle)
                const rightY = tipY - headLength * Math.sin(angle) + headWidth * Math.cos(angle)
                const head = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
                head.setAttribute("points", `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`)
                head.setAttribute("fill", color)
                svg.appendChild(head)
                if (arrowText) {
                    const text = document.createElement("div")
                    text.className = "arrowText"
                    text.textContent = arrowText
                    text.style.left = `${(x1 + x2) / 2}px`
                    text.style.top = `${(y1 + y2) / 2}px`
                    arrows.appendChild(text)
                }
            })
        }
    )
}
function refreshNodeNames() {
    nodeNames.innerHTML = ""
    Object.keys(data.nodes)
        .sort()
        .forEach(name => {
            const option = document.createElement("option")
            option.value = name
            nodeNames.appendChild(option)
        })
}
function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "chart-data.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
function importData() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,application/json"
    input.addEventListener("change", event => {
        const file = event.target.files[0]
        if (!file)
            return
        const reader = new FileReader()
        reader.onload = () => {
            try {
                loadChartData(JSON.parse(reader.result))
            } catch {
                alert("Invalid chart file")
            }
        }
        reader.readAsText(file)
    })
    input.click()
    applySettings()
    renderArrows()
    toggleSettings()
    undoStack.length = 0
    redoStack.length = 0
}
function loadChartData(imported) {
    if (!imported.metadata || !imported.nodes)
        throw new Error("Invalid format")
    data = imported
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    buildColorButtons()
    buildSettingsColors()
    applySettings()
    renderNodes()
    renderArrows()
    refreshNodeNames()
    undoStack.length = 0
    redoStack.length = 0
}
async function loadBuiltInChart(path) {
    if (!confirm("This will permanently delete all chart data. Continue?"))
        return
    try {
        const response = await fetch(path)
        if (!response.ok)
            throw new Error()
        const imported =
            await response.json()
        loadChartData(imported)
        toggleSettings()
        undoStack.length = 0
        redoStack.length = 0
    } catch {
        alert("Failed to load chart")
    }
}
canchart.addEventListener("click", () => loadBuiltInChart("./canchart.json")
)
uschart.addEventListener("click", () => loadBuiltInChart("./uschart.json")
)
frchart.addEventListener("click", () => loadBuiltInChart("./frchart.json")
)
resetButton.addEventListener("click", () => {
    if (!confirm("This will permanently delete all chart data. Continue?"))
        return
    data = createDefaultData()
    widthPicker.value = data.metadata.chartWidth
    heightPicker.value = data.metadata.chartHeight
    saveData()
    fontSize.value = data.metadata.fontSize
    gridGranularity.value = data.metadata.gridGranularity
    applySettings()
    buildColorButtons()
    buildSettingsColors()
    renderNodes()
    renderArrows()
    refreshNodeNames()
    toggleSettings()
    undoStack.length = 0
    redoStack.length = 0
})
buildColorButtons()
updateTypeButtons()
updateColorButtons()
buildSettingsColors()
refreshNodeNames()
renderNodes()