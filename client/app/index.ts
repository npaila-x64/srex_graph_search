class MathUtils {
    public static calculateEuclideanDistance(node1: GraphNode, node2: GraphNode): number {
        const pos1 = node1.position
        const pos2 = node2.position

        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y

        return Math.round(Math.sqrt(dx * dx + dy * dy))
    }

    public static getRandomAngularPosition(): Position {
        const randomDistance = Math.random() * 200
        const randomAngle = Math.random() * 2 * Math.PI
        return this.getAngularPosition(randomAngle, randomDistance)
    }

    public static getRandomAngle(): number {
        return Math.random() * 2 * Math.PI
    }

    public static getAngularPosition(angle: number, distance: number): Position {
        return {
            x: distance * Math.cos(angle),
            y: distance * Math.sin(angle),
        }
    }

    public static getRandomAngularPositionWithDistance(distance: number): Position {
        const randomAngle = Math.random() * 2 * Math.PI
        return this.getAngularPosition(randomAngle, distance)
    }
}

type Position = {
    x: number
    y: number
}

interface NodeData {
    id: string
    label: string
}

interface EdgeData {
    id: string
    source: string
    target: string
    distance: number
}

class Edge {
    id: string
    sourceNode: GraphNode
    targetNode: GraphNode
    private distance: number

    constructor(sourceNode: GraphNode, targetNode: GraphNode) {
        this.id = "e_" + targetNode.id
        this.sourceNode = sourceNode
        this.targetNode = targetNode
        this.distance = MathUtils.calculateEuclideanDistance(sourceNode, targetNode)
        cy.add(this.toObject())
    }

    setDistance(distance: number) {
        const cyEdge = cy.edges(`[source = "${this.sourceNode.id}"][target = "${this.targetNode.id}"]`)
        cyEdge.data('distance', distance)
        this.distance = distance
    }

    updateDistance() {
        this.setDistance(MathUtils.calculateEuclideanDistance(this.sourceNode, this.targetNode))
    }

    getDistance(): number {
        return this.distance
    }

    remove() {
        cy.remove(cy.getElementById(this.id))
    }

    toObject(): { data: EdgeData } {
        return {
            data: {
                id: this.id,
                source: this.sourceNode.id,
                target: this.targetNode.id,
                distance: this.distance,
            },
        }
    }
}

interface GraphNode {
    id: string
    position: Position
    toObject: ToObject
    type: NodeType
}

interface ToObject {
    (): { data: NodeData; position: Position }
}

enum NodeType {
    central_node,
    outer_node,
}

class CentralNode implements GraphNode {
    id: string
    label: string
    position: Position
    type: NodeType

    constructor(id: string, x: number, y: number) {
        this.id = id
        this.label = id
        this.position = { x, y }
        this.type = NodeType.central_node
        cy
        .add(this.toObject())
        .addClass(this.type.toString())
        .lock()
        .ungrabify()
    }

    toObject(): { data: NodeData; position: Position } {
        return {
            data: {
                id: this.id,
                label: this.label,
            },
            position: this.position,
        }
    }

    remove() {
        cy.remove(cy.getElementById(this.id))
    }

    setLabel(label: string) {
        this.label = label
        cy.getElementById(this.id).data('label', label)
    }
}

class OuterNode implements GraphNode {
    id: string
    label: string
    type: NodeType
    position: Position

    constructor(id: string, distance: number = 0) {
        this.id = id
        this.label = id
        this.position = MathUtils.getAngularPosition(MathUtils.getRandomAngle(), distance)
        this.type = NodeType.outer_node
        cy.add(this.toObject()).addClass(this.type.toString())
    }

    remove() {
        cy.remove(cy.getElementById(this.id))
    }

    setLabel(label: string) {
        this.label = label
        cy.getElementById(this.id).data('label', label)
    }

    setAngle(angle: number) {
        this.position = MathUtils.getAngularPosition(angle, this.getDistance())
        cy.getElementById(this.id).position(this.position)
    }

    setDistance(distance: number) {
        this.position = MathUtils.getAngularPosition(MathUtils.getRandomAngle(), distance)
        cy.getElementById(this.id).position(this.position)
    }

    getDistance(): number {
        return Math.sqrt(this.position.x * this.position.x + this.position.y * this.position.y)
    }

    setPosition(position: Position) {
        this.position = position
        cy.getElementById(this.id).position(this.position)
    }

    toObject(): { data: NodeData; position: Position } {
      return {
        data: {
            id: this.id,
            label: this.label,
        },
        position: this.position,
      }
    }
}

interface Term {
    value: string
}

class NeighbourTerm implements Term {
    queryTerm: QueryTerm
    hops: number
    value: string
    node: OuterNode | undefined
    nodePosition: Position = { x: 0, y: 0 }
    edge: Edge | undefined

    hopToDistanceRatio = 60

    constructor(queryTerm: QueryTerm, label: string = '', hops: number = 0) {
        this.queryTerm = queryTerm
        this.value = label
        this.hops = hops
    }

    private convertHopsToDistance(hops: number) {
        return hops * this.hopToDistanceRatio
    }

    private convertDistanceToHops(distance: number) {
        return distance / this.hopToDistanceRatio
    }

    getHops(): number {
        return this.hops
    }

    setTerm(label: string) {
        this.value = label
        this.node?.setLabel(label)
    }

    setPosition(position: Position) {
        this.nodePosition = position
        const nodeDistance = this.edge?.getDistance() ?? 0
        this.hops = this.convertDistanceToHops(nodeDistance)
        this.node?.setPosition(position)
        this.edge?.updateDistance()
    }

    setHops(hops: number) {
        this.hops = hops
        const nodeDistance = this.convertHopsToDistance(hops)
        this.nodePosition = MathUtils.getRandomAngularPositionWithDistance(nodeDistance)
        this.node?.setPosition(this.nodePosition)
        this.edge?.updateDistance()
    }

    displayViews() {
        this.node = new OuterNode(getRandomString(6))
        this.node.setPosition(this.nodePosition)
        
        this.node.label = this.value
        cy.getElementById(this.node.id).data('label', this.value)
        
        if (this.queryTerm.node === undefined) return 
        this.edge = new Edge(this.queryTerm.node, this.node)
    }

    removeViews() {
        this.node?.remove()
        this.edge?.remove()
    }
}

class QueryTerm implements Term {
    neighbourTerms: NeighbourTerm[] = []
    node: CentralNode | undefined
    value: string

    constructor(value: string) {
        this.value = value
    }

    addNeighbourTerm(neighbourTerm: NeighbourTerm) {
        this.neighbourTerms.push(neighbourTerm)
    }

    displayViews() {
        this.node = new CentralNode(this.value, 0, 0)
        for (let neighbourTerm of this.neighbourTerms) {
            neighbourTerm.displayViews()
        }
    }

    removeViews() {
        for (let neighbourTerm of this.neighbourTerms) {
            neighbourTerm.removeViews()
        }
        this.node?.remove()
    }

    setLabel(label: string) {
        this.value = label
        this.node?.setLabel(label)
    }

    removeNeighbourTerm(neighbourTerm: NeighbourTerm) {
        this.neighbourTerms = this.neighbourTerms.filter(term => term !== neighbourTerm)
        neighbourTerm.removeViews()
    }

    getNeighbourTermById(id: string): NeighbourTerm | undefined {
        return this.neighbourTerms.find(p => p.node?.id === id)
    }
}

function getRandomString(chars: number) {
    const charsList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < chars; i++) {
        result += charsList.charAt(Math.floor(Math.random() * charsList.length))
    }
    return result
}

const cy = cytoscape({
    container: document.getElementById("cy") as HTMLElement,
    layout: {
        name: "preset",
    },
    style: [
        {
            selector: '.' + NodeType.central_node,
            style: {
            "background-color": 'red',
            'width': '20px',
            'height': '20px',
            'label': "data(id)",
            },
        },
        {
            selector: "edge",
            style: {
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#ccc",
            label: "data(distance)",
            "width": "2px", // set the width of the edge
            "font-size": "12px" // set the font size of the label            
            },
        },
        {
            selector: '.' + NodeType.outer_node,
            style: {
              'background-color': 'blue',
              'width': '15px',
              'height': '15px',
              'label': 'data(label)'
            }
        }
    ],
    userZoomingEnabled: false
})

cy.on('drag', 'node', evt => {
    queryService.activeQueryTermService?.nodeDragged(evt.target.id(), evt.target.position())
})

class NeighbourTermList {
    activeTermsService: QueryTermService | undefined
    table: HTMLElement

    constructor() {
        this.table = document.getElementById('neighboursTermsTable') as HTMLElement
    }

    public setActiveService(termsService: QueryTermService) {
        this.activeTermsService = termsService
    }

    public updateTable() {
        const tbody = this.table.getElementsByTagName('tbody')[0]
        tbody.innerHTML = '' // Clear existing rows
        if (this.activeTermsService === undefined) return
        for(const neighbourTerm of this.activeTermsService.queryTerm.neighbourTerms) {
            const row = tbody.insertRow()
            const cell1 = row.insertCell(0)
            const cell2 = row.insertCell(1)

            cell1.innerHTML = neighbourTerm.value
            cell2.innerHTML = neighbourTerm.getHops().toFixed(1)
        }
    }
}

class QueryTermService {
    queryService: QueryService
    queryTerm: QueryTerm
    isVisible: boolean = false
    apiUrl = 'http://localhost:3000/get-neighbour-terms'

    constructor(queryService: QueryService, queryTerm: QueryTerm) {
        this.queryService = queryService
        this.queryTerm = queryTerm
        this.retrieveData();
    }

    private async retrieveData() {
        const result = await this.postData(this.apiUrl, { query: this.queryTerm.value })
        if (result) {
            for (let termObject of result['neighbour_terms']) {
                const neighbourTerm = new NeighbourTerm(this.queryTerm)
                neighbourTerm.setTerm(termObject.term)
                neighbourTerm.setHops(termObject.distance)
                this.addNeighbourTerm(neighbourTerm)
            }
        }
    }

    private async postData(url: string, data: any) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          })
      
          // Handle the response
          const result = await response.json()
          console.log('Success:', result)
          return result
        } catch (error) {
          console.error('Error:', error)
        }
    }

    private addNeighbourTerm(neighbourTerm: NeighbourTerm) {
        this.queryTerm.addNeighbourTerm(neighbourTerm)

        this.queryService.dataWasUpdated()
        if (this.isVisible) this.display()
    }

    nodeDragged(id: string, position: Position) {
        const term: Term | undefined = this.queryTerm.getNeighbourTermById(id)
        if (term === undefined) return
        (term as NeighbourTerm).setPosition(position)

        this.queryService.dataWasUpdated()
    }

    public display() {
        this.isVisible = true
        this.queryTerm.removeViews()
        this.queryTerm.displayViews()
        this.center()
    }

    public deactivate() {
        this.isVisible = false
        this.queryTerm.removeViews()
    }

    public removeNeighbourTerm(id: string) {
        const term: Term | undefined = this.queryTerm.getNeighbourTermById(id)
        if (term === undefined) return
        this.queryTerm.removeNeighbourTerm(term as NeighbourTerm)

        this.queryService.dataWasUpdated()
    }

    private center() {
        cy.zoom(1.2)
        if (this.queryTerm.node === undefined) return 
        cy.center(cy.getElementById(this.queryTerm.node.id))
    }
}

class Query {
    private query: string = ''
    private queryTerms: QueryTerm[] = []

    constructor(query: string) {
        this.query = query
    }

    public setValue(query: string) {
        this.query = query
    }

    public getValue(): string {
        return this.query
    }

    public setQueryTerms(queryTerms: QueryTerm[]): void {
        this.queryTerms = queryTerms
    }

    public getQueryTerms(): QueryTerm[] {
        return this.queryTerms
    }
}

class QueryComponent {
    private query: string = ''
    private queryService: QueryService
    private input: HTMLInputElement

    constructor(queryService: QueryService) {
        this.queryService = queryService
        this.input = document.getElementById('queryInput') as HTMLInputElement

        this.input.addEventListener("keyup", event => {
            if(event.key !== "Enter") return
            event.stopImmediatePropagation()
            this.query = this.input.value.trim()
            this.input.value = ''
            event.preventDefault()
            this.queryService.setQuery(this.query)
        })
    }
}

class QueryTermList {
    dynamicList: HTMLElement
    queryService: QueryService

    constructor(queryService: QueryService) {
        this.queryService = queryService
        this.dynamicList = document.getElementById('queryTermsList') as HTMLElement
    }

    public updateList(queryTerms: QueryTerm[]) {
        this.dynamicList.innerHTML = ''
        queryTerms.forEach(queryTerm => {
            // Create a new list item element
            const listItem = document.createElement("li")
            listItem.textContent = queryTerm.value

            listItem.addEventListener("click", () => {
                this.queryService.setActiveTermsService(queryTerm.value)
            })

            // Append the list item to the dynamic list container
            this.dynamicList.appendChild(listItem)
        })
    }
}

class QueryService {
    public activeQueryTermService: QueryTermService | undefined
    public queryTermServices: QueryTermService[] = []
    private neighbourTermList: NeighbourTermList
    private queryTermList: QueryTermList
    private query: Query

    constructor() {
        this.neighbourTermList = new NeighbourTermList()
        this.queryTermList = new QueryTermList(this)
        this.query = new Query('')
    }

    public dataWasUpdated() {
        this.neighbourTermList.updateTable()
    }

    public queryGenerationWasRequested() {
        const termService = new QueryTermService(this, new QueryTerm(this.query.getValue()))

        this.queryTermServices = []
        this.queryTermServices.push(termService)
        // this.decomposeQuery()
        this.queryTermList.updateList(
            this.queryTermServices.map(termService => termService.queryTerm)
        )
        if (this.queryTermServices.length > 0) {
            this.activeQueryTermService = this.queryTermServices[0]
            this.neighbourTermList.setActiveService(this.activeQueryTermService)
        }
    }

    private decomposeQuery() {
        this.queryTermServices = []
        for (let term of this.query.getValue().split(' ')) {
            const termService = new QueryTermService(this, new QueryTerm(term))
            this.queryTermServices.push(termService)
        }
    }

    public setQuery(query: string) {
        this.activeQueryTermService?.deactivate()
        
        this.query = new Query(query)
        this.queryGenerationWasRequested()

        if (this.queryTermServices.length === 0) return
        this.setActiveTermsService(this.queryTermServices[0].queryTerm.value)
    }

    public setActiveTermsService(queryTerm: string) {
        this.activeQueryTermService?.deactivate()
        const queryTermService = this.findQueryTermService(queryTerm)
        if (queryTermService === undefined) return
        this.activeQueryTermService = queryTermService
        this.activeQueryTermService.display()
        this.neighbourTermList.setActiveService(queryTermService)
        this.dataWasUpdated()
        return
    }

    private findQueryTermService(queryTerm: string): QueryTermService | undefined {
        return this.queryTermServices.find(termService => termService.queryTerm.value === queryTerm)
    }
}

const queryService: QueryService = new QueryService()
const queryComponent: QueryComponent = new QueryComponent(queryService)

cy.ready(() => {
    // queryService.queryTermServices[0].addNeighbourTerm('holaA')
    // queryService.queryTermServices[0].addNeighbourTerm('holaB')
    // queryService.queryTermServices[0].addNeighbourTerm('holaC')
    // queryService.queryTermServices[1].addNeighbourTerm('mundoA')
    // queryService.queryTermServices[1].addNeighbourTerm('mundoB')
    // queryService.queryTermServices[1].addNeighbourTerm('mundoC')
})

let searchTerm = "Graphs"

const mockResults = [
    "Paper 1 about " + searchTerm,
    "Paper 2 related to " + searchTerm,
    "Another paper discussing " + searchTerm,
    "Further findings on " + searchTerm
]

// Display results
const resultsList = document.getElementById('resultsList') as HTMLElement
resultsList.innerHTML = "" // Clear previous results

for (let i = 0; i < mockResults.length; i++) {
    let listItem = document.createElement('li')
    listItem.textContent = (i + 1) + ". " + mockResults[i]
    resultsList.appendChild(listItem)

    listItem.addEventListener("click", () => {
        alert(mockResults[i])
    })
}

// quick and dirty way to get instances in console
;(window as any).cy = cy
;(window as any).queryService = queryService
