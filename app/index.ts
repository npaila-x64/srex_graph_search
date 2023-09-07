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
    outerNodes: OuterNode[] = []
    
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
    distance: number
    position: Position
    type: NodeType

    constructor(id: string, distance: number, position: Position) {
        this.id = id
        this.label = id
        this.distance = distance
        this.position = position
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
    term: string
    node: GraphNode
}

class NeighbourTerm implements Term {
    term: string
    node: OuterNode
    union: Union | undefined

    constructor(id: string, term: string, queryTerm: QueryTerm) {
        this.term = term
        const randomDistance = Math.random() * 200
        this.node = new OuterNode(
            `${id}`, 
            randomDistance,
            MathUtils.getRandomAngularPositionFrom(queryTerm.node.position, randomDistance)
        )
        this.node.label = term
        cy.getElementById(this.node.id).data('label', term)
    }

    updateUnion() {
        this.union?.edge.updateDistance()
    }

    remove() {
        this.node.remove()
        this.union?.remove()
    }
}

class QueryTerm implements Term {
    term: string
    node: CentralNode
    neighbourTerms: NeighbourTerm[] = []

    constructor(label: string) {
        this.term = label
        this.node = new CentralNode(label, 300, 300)
    }

    addNeighbourTerm(neighbourTerm: NeighbourTerm) {
        this.node.outerNodes.push(neighbourTerm.node)
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

class Union {
    queryTerm: Term
    neighbourTerm: Term
    edge: Edge
    hops: number

    constructor(queryTerm: Term, neighbourTerm: Term, hops: number = 0) {
        this.queryTerm = queryTerm
        this.neighbourTerm = neighbourTerm
        this.hops = hops
        this.edge = new Edge(queryTerm.node, neighbourTerm.node)
    }

    getHops(): string {
        return this.edge.getDistance().toString()
    }

    remove() {
        this.edge.remove()
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

        const neighbourTerm = new NeighbourTerm(getRandomString(7), term, this.queryTerm)
        this.queryTerm.addNeighbourTerm(neighbourTerm)

        const union = new Union(this.queryTerm, neighbourTerm)
        neighbourTerm.union = union

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
            cell3.innerHTML = neighbourTerm.union ? neighbourTerm.union.getHops() : ''
        }
    }

    private getTermById(id: string): Term | undefined {
        return this.queryTerm.neighbourTerms.find(term => term.node.id === id)
    }

    nodeDragged(id: string, position: Position) {
        const term: Term | undefined = this.getTermById(id)
        if (term === undefined) return
        const neighbourTerm = term as NeighbourTerm
        neighbourTerm.node.position = position

        neighbourTerm.updateUnion()
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

// quick and dirty way to get the cytoscape instance in the console
;(window as any).cy = cy
;(window as any).controller = termsController
