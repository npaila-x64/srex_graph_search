"use strict";
class MathUtils {
    static calculateEuclideanDistance(node1, node2) {
        const pos1 = node1.position;
        const pos2 = node2.position;
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy));
    }
    static getRandomAngularPositionFrom(position, distance) {
        const randomAngle = Math.random() * 2 * Math.PI;
        return {
            x: position.x + distance * Math.cos(randomAngle),
            y: position.y + distance * Math.sin(randomAngle),
        };
    }
}
class Edge {
    constructor(sourceNode, targetNode) {
        this.id = "e_" + targetNode.id;
        this.sourceNode = sourceNode;
        this.targetNode = targetNode;
        this.distance = MathUtils.calculateEuclideanDistance(sourceNode, targetNode);
        cy.add(this.toObject());
    }
    setDistance(distance) {
        const cyEdge = cy.edges(`[source = "${this.sourceNode.id}"][target = "${this.targetNode.id}"]`);
        cyEdge.data('distance', distance);
        this.distance = distance;
    }
    getDistance() {
        return this.distance;
    }
    remove() {
        cy.remove(cy.getElementById(this.id));
    }
    toObject() {
        return {
            data: {
                id: this.id,
                source: this.sourceNode.id,
                target: this.targetNode.id,
                distance: this.distance,
            },
        };
    }
}
var NodeType;
(function (NodeType) {
    NodeType[NodeType["central_node"] = 0] = "central_node";
    NodeType[NodeType["outer_node"] = 1] = "outer_node";
})(NodeType || (NodeType = {}));
class CentralNode {
    constructor(id, x, y) {
        this.id = id;
        this.label = id;
        this.position = { x, y };
        this.type = NodeType.central_node;
        cy.add(this.toObject()).addClass(this.type.toString());
    }
    toObject() {
        return {
            data: {
                id: this.id,
                label: this.label,
            },
            position: this.position,
        };
    }
}
class OuterNode {
    constructor(centralNode, id, distance) {
        this.centralNode = centralNode;
        this.id = id;
        this.label = id;
        this.distance = distance;
        this.position = MathUtils.getRandomAngularPositionFrom(centralNode.position, distance);
        this.type = NodeType.outer_node;
        cy.add(this.toObject()).addClass(this.type.toString());
    }
    remove() {
        cy.remove(cy.getElementById(this.id));
    }
    toObject() {
        return {
            data: {
                id: this.id,
                label: this.label,
            },
            position: this.position,
        };
    }
}
class NeighbourTerm {
    constructor(label, queryTerm, edge) {
        this.label = label;
        this.node = new OuterNode(queryTerm.node, `${this.label}_${queryTerm.neighbourTerms.length.toString()}`, Math.random() * 200);
        this.node.label = label;
        this.edge = edge;
        cy.getElementById(this.node.id).data('label', label);
    }
    remove() {
        this.node.remove();
        this.edge.remove();
    }
}
class QueryTerm {
    constructor(label) {
        this.neighbourTerms = [];
        this.label = label;
        this.node = new CentralNode(label, 300, 300);
    }
    addNeighbourTerm(neighbourTerm) {
        this.neighbourTerms.push(neighbourTerm);
    }
}
const cy = cytoscape({
    container: document.getElementById("cy"),
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
                "width": "2px",
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
});
cy.on('drag', 'node', evt => {
    termsController.nodeDragged(evt.target.id(), evt.target.position());
});
class TermsController {
    constructor() {
        // Views
        this.edges = [];
        // Models
        this.terms = [];
        this.queryTerms = [];
        this.table = document.getElementById('neighboursTermsTable');
        this.input = document.getElementById('neighboursTermsInput');
        this.addQueryTerm('QueryTerm');
    }
    linkNodes(node1, node2) {
        const edge = new Edge(node1, node2);
        this.edges.push(edge);
        return edge;
    }
    addQueryTerm(label = undefined) {
        if (label === undefined)
            label = "Query Term";
        const queryTerm = new QueryTerm(label);
        this.queryTerms.push(queryTerm);
        this.terms.push(queryTerm);
        this.updateTermsTable();
        return queryTerm;
    }
    addNeighbourTerm(label = undefined) {
        if (label === undefined)
            label = this.getNeighbourTermInput();
        const queryTerm = this.queryTerms[0];
        const neighbourTerm = new NeighbourTerm(label, queryTerm, new Edge(queryTerm.node, queryTerm.node));
        neighbourTerm.edge.remove();
        neighbourTerm.edge = this.linkNodes(queryTerm.node, neighbourTerm.node);
        queryTerm.addNeighbourTerm(neighbourTerm);
        this.terms.push(neighbourTerm);
        this.updateTermsTable();
        return neighbourTerm;
    }
    getNeighbourTermInput() {
        const inputNeighbourTerm = this.input.value.trim();
        const input = inputNeighbourTerm === '' ? (Math.random() + 1).toString(36).substring(7) : inputNeighbourTerm;
        return input;
    }
    updateTermsTable() {
        var _a;
        const tbody = this.table.getElementsByTagName('tbody')[0];
        tbody.innerHTML = ''; // Clear existing rows
        for (const neighbourTerm of this.queryTerms[0].neighbourTerms) {
            const row = tbody.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            cell1.innerHTML = neighbourTerm.node.id;
            cell2.innerHTML = neighbourTerm.label;
            cell3.innerHTML = (_a = neighbourTerm.edge) === null || _a === void 0 ? void 0 : _a.getDistance().toString();
        }
    }
    getTermById(id) {
        return this.terms.find(term => term.node.id === id);
    }
    getEdge(node1, node2) {
        return this.edges.find(edge => edge.sourceNode.id === node1.id && edge.targetNode.id === node2.id);
    }
    updateEdgeDistance(node1, node2) {
        const edge = this.getEdge(node1, node2);
        if (edge === undefined)
            return;
        const distance = MathUtils.calculateEuclideanDistance(node1, node2);
        edge.setDistance(distance);
    }
    nodeDragged(id, position) {
        const term = this.getTermById(id);
        if (term === undefined)
            return;
        if (term instanceof QueryTerm) {
            const queryTerm = term;
            queryTerm.node.position = position;
            for (const neighbourTerm of queryTerm.neighbourTerms) {
                this.updateEdgeDistance(queryTerm.node, neighbourTerm.node);
            }
        }
        else {
            const neighbourTerm = term;
            neighbourTerm.node.position = position;
            this.updateEdgeDistance(neighbourTerm.node.centralNode, neighbourTerm.node);
        }
        this.updateTermsTable();
    }
    removeNeighbourTerm(label = undefined) {
        if (label === undefined)
            label = this.getNeighbourTermInput();
        const term = this.terms.find(p => p.label === label);
        if (term === undefined)
            return;
        if (term instanceof QueryTerm)
            return;
        const neighbourTerm = term;
        const edge = neighbourTerm.edge;
        this.edges = this.edges.filter(e => e.id !== edge.id);
        neighbourTerm.remove();
        this.updateTermsTable();
    }
}
const termsController = new TermsController();
cy.ready(() => {
    termsController.addNeighbourTerm();
    termsController.addNeighbourTerm('NeighbourB');
    termsController.addNeighbourTerm('NeighbourC');
    cy.zoom(1.2);
    cy.center(cy.getElementById(termsController.queryTerms[0].node.id)); // Center viewport on the 'central' node
});
window.cy = cy;
window.controller = termsController;
