class MathUtils {
    public static calculateEuclideanDistance(node1: GraphNode, node2: GraphNode): number {
        const pos1 = node1.position
        const pos2 = node2.position
      
        const dx = pos1.x - pos2.x
        const dy = pos1.y - pos2.y
      
        return Math.round(Math.sqrt(dx * dx + dy * dy))
    }

    public static getRandomAngularPositionFrom(position: Position, distance: number): Position {
        const randomAngle = Math.random() * 2 * Math.PI
        return {
            x: position.x + distance * Math.cos(randomAngle),
            y: position.y + distance * Math.sin(randomAngle),
        }
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
        cy.add(this.toObject()).addClass(this.type.toString())
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
    centralNode: CentralNode
    id: string
    label: string
    distance: number
    position: Position
    type: NodeType

    constructor(centralNode: CentralNode, id: string, distance: number) {
        this.centralNode = centralNode
        this.id = id
        this.label = id
        this.distance = distance
        this.position = MathUtils.getRandomAngularPositionFrom(centralNode.position, distance)
        this.type = NodeType.outer_node
        cy.add(this.toObject()).addClass(this.type.toString())
    }

    remove() {
        cy.remove(cy.getElementById(this.id))
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
    label: string
    node: GraphNode
}

class NeighbourTerm implements Term {
    label: string
    node: OuterNode
    edge: Edge

    constructor(label: string, queryTerm: QueryTerm, edge: Edge) {
        this.label = label
        this.node = new OuterNode(
            queryTerm.node, 
            `${this.label}_${queryTerm.neighbourTerms.length.toString()}`, 
            Math.random() * 200
        )
        this.node.label = label
        this.edge = edge
        cy.getElementById(this.node.id).data('label', label)
    }

    remove() {
        this.node.remove()
        this.edge.remove()
    }
}

class QueryTerm implements Term {
    label: string
    node: CentralNode
    neighbourTerms: NeighbourTerm[] = []

    constructor(label: string) {
        this.label = label
        this.node = new CentralNode(label, 300, 300)
    }

    addNeighbourTerm(neighbourTerm: NeighbourTerm) {
        this.neighbourTerms.push(neighbourTerm)
    }
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
    // Views
    edges: Edge[] = []

    // Models
    terms: Term[] = []
    queryTerms: QueryTerm[] = []

    // HTML Elements
    table: HTMLElement
    input: HTMLInputElement

    constructor() {
        this.table = document.getElementById('neighboursTermsTable') as HTMLElement
        this.input = document.getElementById('neighboursTermsInput') as HTMLInputElement
        this.addQueryTerm('QueryTerm')
    }

    private linkNodes(node1: CentralNode, node2: OuterNode): Edge {
        const edge = new Edge(node1, node2)
        this.edges.push(edge)

        return edge
    }

    addQueryTerm(label: string | undefined = undefined): QueryTerm {
        if (label === undefined) label = "Query Term"

        const queryTerm = new QueryTerm(label)
        this.queryTerms.push(queryTerm)
        this.terms.push(queryTerm)

        this.updateTermsTable()
        return queryTerm
    }

    addNeighbourTerm(label: string | undefined = undefined): NeighbourTerm {
        if (label === undefined) label = this.getNeighbourTermInput()

        const queryTerm = this.queryTerms[0]

        const neighbourTerm = new NeighbourTerm(label, queryTerm, new Edge(queryTerm.node, queryTerm.node))
        neighbourTerm.edge.remove()
        neighbourTerm.edge = this.linkNodes(queryTerm.node, neighbourTerm.node)

        queryTerm.addNeighbourTerm(neighbourTerm)
        this.terms.push(neighbourTerm)

        this.updateTermsTable()
        return neighbourTerm
    }

    private getNeighbourTermInput(): string {
        const inputNeighbourTerm = this.input.value.trim()
        const input = inputNeighbourTerm === '' ? (Math.random() + 1).toString(36).substring(7) : inputNeighbourTerm
        return input
    }

    private updateTermsTable() {
        const tbody = this.table.getElementsByTagName('tbody')[0]
        tbody.innerHTML = '' // Clear existing rows

        for(const neighbourTerm of this.queryTerms[0].neighbourTerms) {
            const row = tbody.insertRow()
            const cell1 = row.insertCell(0)
            const cell2 = row.insertCell(1)
            const cell3 = row.insertCell(2)

            cell1.innerHTML = neighbourTerm.node.id
            cell2.innerHTML = neighbourTerm.label
            cell3.innerHTML = neighbourTerm.edge?.getDistance().toString()
        }
    }

    private getTermById(id: string): Term | undefined {
        return this.terms.find(term => term.node.id === id)
    }

    private getEdge(node1: GraphNode, node2: GraphNode): Edge | undefined {
        return this.edges.find(edge => edge.sourceNode.id === node1.id && edge.targetNode.id === node2.id)
    }

    private updateEdgeDistance(node1: CentralNode, node2: OuterNode) {
        const edge: Edge | undefined = this.getEdge(node1, node2)
        if (edge === undefined) return

        const distance = MathUtils.calculateEuclideanDistance(node1, node2)
        edge.setDistance(distance)
    }

    nodeDragged(id: string, position: Position) {
        const term: Term | undefined = this.getTermById(id)
        if (term === undefined) return
        if (term instanceof QueryTerm) {
            const queryTerm = term as QueryTerm
            queryTerm.node.position = position

            for(const neighbourTerm of queryTerm.neighbourTerms) {
                this.updateEdgeDistance(queryTerm.node, neighbourTerm.node)
            }
        } else {
            const neighbourTerm = term as NeighbourTerm
            neighbourTerm.node.position = position

            this.updateEdgeDistance(neighbourTerm.node.centralNode, neighbourTerm.node)
        }
        this.updateTermsTable()
    }

    removeNeighbourTerm(label: string | undefined = undefined) {
        if (label === undefined) label = this.getNeighbourTermInput()
        const term: Term | undefined = this.terms.find(p => p.label === label)
        if (term === undefined) return
        if (term instanceof QueryTerm) return

        const neighbourTerm = term as NeighbourTerm
        const edge: Edge | undefined = neighbourTerm.edge
        this.edges = this.edges.filter(e => e.id !== edge.id)
        neighbourTerm.remove()
        
        this.updateTermsTable()
    }
}

const termsController: TermsController = new TermsController()

cy.ready(() => {
    termsController.addNeighbourTerm()
    termsController.addNeighbourTerm('NeighbourB')
    termsController.addNeighbourTerm('NeighbourC')

    cy.zoom(1.2)
    cy.center(cy.getElementById(termsController.queryTerms[0].node.id)) // Center viewport on the 'central' node
})

// quick and dirty way to get the cytoscape instance in the console
;(window as any).cy = cy
;(window as any).controller = termsController
