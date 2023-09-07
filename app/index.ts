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
}
  
class OuterNode implements GraphNode {
    id: string
    label: string
    angle: number
    type: NodeType
    position: Position

    constructor(id: string, distance: number = 0) {
        this.id = id
        this.label = id
        this.angle = MathUtils.getRandomAngle()
        this.position = MathUtils.getAngularPosition(this.angle, distance)
        this.type = NodeType.outer_node
        cy.add(this.toObject()).addClass(this.type.toString())
    }

    remove() {
        cy.remove(cy.getElementById(this.id))
    }

    setDistance(distance: number) {
        this.position = MathUtils.getAngularPosition(this.angle, distance)
        cy.getElementById(this.id).position(this.position)
    }

    setPosition(position: Position) {
        this.position = position
        this.angle = Math.atan2(position.y, position.x)
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
    term: string
    node: GraphNode
}

class NeighbourTerm implements Term {
    hops: number
    term: string
    node: OuterNode
    edge: Edge

    hopToDistanceRatio = 60

    constructor(queryTerm: QueryTerm, term: string = '', hops: number = 0) {
        this.term = term
        this.hops = hops
        this.node = new OuterNode(`${getRandomString(8)}`)
        this.node.setDistance(this.toDistance(hops))
        this.node.label = term
        this.edge = new Edge(queryTerm.node, this.node)
        cy.getElementById(this.node.id).data('label', term)
    }

    private toDistance(hops: number) {
        return hops * this.hopToDistanceRatio
    }

    updateDistance() {
        this.edge.updateDistance()
    }

    getHops(): string {
        return (this.edge.getDistance() / this.hopToDistanceRatio).toFixed(1).toString()
    }

    setTerm(term: string) {
        this.term = term
        this.node.label = term
        cy.getElementById(this.node.id).data('label', term)
    }

    setHops(hops: number) {
        this.hops = hops
        this.node.setDistance(this.toDistance(hops))
        this.updateDistance()
    }

    remove() {
        this.node.remove()
        this.edge.remove()
    }
}

class QueryTerm implements Term {
    term: string
    node: CentralNode
    neighbourTerms: NeighbourTerm[] = []

    constructor(label: string) {
        this.term = label
        this.node = new CentralNode(label, 0, 0)
    }

    addNeighbourTerm(neighbourTerm: NeighbourTerm) {
        this.neighbourTerms.push(neighbourTerm)
    }

    removeNeighbourTerm(neighbourTerm: NeighbourTerm) {
        this.neighbourTerms = this.neighbourTerms.filter(term => term !== neighbourTerm)
        neighbourTerm.remove()
    }

    getNeighbourTermById(id: string): NeighbourTerm | undefined {
        return this.neighbourTerms.find(p => p.node.id === id)
    }
}

function getRandomString(chars: number) {
    return (Math.random() + 1).toString(36).substring(chars)
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
    termsController.nodeDragged(evt.target.id(), evt.target.position())
})

class TermsController {
    // Models
    queryTerm: QueryTerm

    // HTML Elements
    table: HTMLElement
    input: HTMLInputElement

    constructor() {
        this.table = document.getElementById('neighboursTermsTable') as HTMLElement
        this.input = document.getElementById('neighboursTermsInput') as HTMLInputElement
        this.queryTerm = new QueryTerm('QueryTerm')
    }

    addNeighbourTerm(term: string | undefined = undefined): NeighbourTerm {
        if (term === undefined) term = this.getNeighbourTermInput()

        const neighbourTerm = new NeighbourTerm(this.queryTerm)
        neighbourTerm.setTerm(term)
        neighbourTerm.setHops(Math.random() * 5)
        this.queryTerm.addNeighbourTerm(neighbourTerm)


        this.updateTermsTable()
        return neighbourTerm
    }

    private getNeighbourTermInput(): string {
        const inputNeighbourTerm = this.input.value.trim()
        const input = inputNeighbourTerm === '' ? getRandomString(7) : inputNeighbourTerm
        return input
    }

    private updateTermsTable() {
        const tbody = this.table.getElementsByTagName('tbody')[0]
        tbody.innerHTML = '' // Clear existing rows
        
        for(const neighbourTerm of this.queryTerm.neighbourTerms) {
            const row = tbody.insertRow()
            const cell1 = row.insertCell(0)
            const cell2 = row.insertCell(1)
            const cell3 = row.insertCell(2)

            cell1.innerHTML = neighbourTerm.node.id
            cell2.innerHTML = neighbourTerm.term
            cell3.innerHTML = neighbourTerm.getHops()
        }
    }

    private getNeighbourTermById(id: string): Term | undefined {
        return this.queryTerm.neighbourTerms.find(term => term.node.id === id)
    }

    nodeDragged(id: string, position: Position) {
        const term: Term | undefined = this.getNeighbourTermById(id)
        if (term === undefined) return
        const neighbourTerm = term as NeighbourTerm
        neighbourTerm.node.setPosition(position)
        neighbourTerm.updateDistance()

        this.updateTermsTable()
    }

    removeNeighbourTerm(id: string | undefined = undefined) {
        if (id === undefined) id = this.getNeighbourTermInput()
        const term: Term | undefined = this.queryTerm.getNeighbourTermById(id)
        if (term === undefined) return
        this.queryTerm.removeNeighbourTerm(term as NeighbourTerm)
        this.updateTermsTable()
    }

    center() {
        cy.zoom(1.2)
        cy.center(cy.getElementById(this.queryTerm.node.id))
    }
}

const termsController: TermsController = new TermsController()

cy.ready(() => {
    termsController.addNeighbourTerm()
    termsController.addNeighbourTerm('NeighbourB')
    termsController.addNeighbourTerm('NeighbourC')

    termsController.center()
})

// quick and dirty way to get instances in console
;(window as any).cy = cy
;(window as any).controller = termsController
