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
    updateDistance() {
        this.setDistance(MathUtils.calculateEuclideanDistance(this.sourceNode, this.targetNode));
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
        this.outerNodes = [];
        this.id = id;
        this.label = id;
        this.position = { x, y };
        this.type = NodeType.central_node;
        cy
            .add(this.toObject())
            .addClass(this.type.toString())
            .lock()
            .ungrabify();
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
    constructor(id, distance, position) {
        this.id = id;
        this.label = id;
        this.distance = distance;
        this.position = position;
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
    constructor(id, term, queryTerm) {
        this.term = term;
        const randomDistance = Math.random() * 200;
        this.node = new OuterNode(`${id}`, randomDistance, MathUtils.getRandomAngularPositionFrom(queryTerm.node.position, randomDistance));
        this.node.label = term;
        cy.getElementById(this.node.id).data('label', term);
    }
    updateUnion() {
        var _a;
        (_a = this.union) === null || _a === void 0 ? void 0 : _a.edge.updateDistance();
    }
    remove() {
        var _a;
        this.node.remove();
        (_a = this.union) === null || _a === void 0 ? void 0 : _a.remove();
    }
}
class QueryTerm {
    constructor(label) {
        this.neighbourTerms = [];
        this.term = label;
        this.node = new CentralNode(label, 300, 300);
    }
    addNeighbourTerm(neighbourTerm) {
        this.node.outerNodes.push(neighbourTerm.node);
        this.neighbourTerms.push(neighbourTerm);
    }
    removeNeighbourTerm(neighbourTerm) {
        this.neighbourTerms = this.neighbourTerms.filter(term => term !== neighbourTerm);
        neighbourTerm.remove();
    }
    getNeighbourTermById(id) {
        return this.neighbourTerms.find(p => p.node.id === id);
    }
}
class Union {
    constructor(queryTerm, neighbourTerm, hops = 0) {
        this.queryTerm = queryTerm;
        this.neighbourTerm = neighbourTerm;
        this.hops = hops;
        this.edge = new Edge(queryTerm.node, neighbourTerm.node);
    }
    getHops() {
        return this.edge.getDistance().toString();
    }
    remove() {
        this.edge.remove();
    }
}
function getRandomString(chars) {
    return (Math.random() + 1).toString(36).substring(chars);
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
        this.table = document.getElementById('neighboursTermsTable');
        this.input = document.getElementById('neighboursTermsInput');
        this.queryTerm = new QueryTerm('QueryTerm');
    }
    addNeighbourTerm(term = undefined) {
        if (term === undefined)
            term = this.getNeighbourTermInput();
        const neighbourTerm = new NeighbourTerm(getRandomString(7), term, this.queryTerm);
        this.queryTerm.addNeighbourTerm(neighbourTerm);
        const union = new Union(this.queryTerm, neighbourTerm);
        neighbourTerm.union = union;
        this.updateTermsTable();
        return neighbourTerm;
    }
    getNeighbourTermInput() {
        const inputNeighbourTerm = this.input.value.trim();
        const input = inputNeighbourTerm === '' ? getRandomString(7) : inputNeighbourTerm;
        return input;
    }
    updateTermsTable() {
        const tbody = this.table.getElementsByTagName('tbody')[0];
        tbody.innerHTML = ''; // Clear existing rows
        for (const neighbourTerm of this.queryTerm.neighbourTerms) {
            const row = tbody.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            cell1.innerHTML = neighbourTerm.node.id;
            cell2.innerHTML = neighbourTerm.term;
            cell3.innerHTML = neighbourTerm.union ? neighbourTerm.union.getHops() : '';
        }
    }
    getTermById(id) {
        return this.queryTerm.neighbourTerms.find(term => term.node.id === id);
    }
    nodeDragged(id, position) {
        const term = this.getTermById(id);
        if (term === undefined)
            return;
        const neighbourTerm = term;
        neighbourTerm.node.position = position;
        neighbourTerm.updateUnion();
        this.updateTermsTable();
    }
    removeNeighbourTerm(id = undefined) {
        if (id === undefined)
            id = this.getNeighbourTermInput();
        const term = this.queryTerm.getNeighbourTermById(id);
        if (term === undefined)
            return;
        this.queryTerm.removeNeighbourTerm(term);
        this.updateTermsTable();
    }
    center() {
        cy.zoom(1.2);
        cy.center(cy.getElementById(this.queryTerm.node.id));
    }
}
const termsController = new TermsController();
cy.ready(() => {
    termsController.addNeighbourTerm();
    termsController.addNeighbourTerm('NeighbourB');
    termsController.addNeighbourTerm('NeighbourC');
    termsController.center();
});
window.cy = cy;
window.controller = termsController;
