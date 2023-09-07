"use strict";
class MathUtils {
    static calculateEuclideanDistance(node1, node2) {
        const pos1 = node1.position;
        const pos2 = node2.position;
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.round(Math.sqrt(dx * dx + dy * dy));
    }
    static getRandomAngularPosition() {
        const randomDistance = Math.random() * 200;
        const randomAngle = Math.random() * 2 * Math.PI;
        return this.getAngularPosition(randomAngle, randomDistance);
    }
    static getRandomAngle() {
        return Math.random() * 2 * Math.PI;
    }
    static getAngularPosition(angle, distance) {
        return {
            x: distance * Math.cos(angle),
            y: distance * Math.sin(angle),
        };
    }
    static getRandomAngularPositionWithDistance(distance) {
        const randomAngle = Math.random() * 2 * Math.PI;
        return this.getAngularPosition(randomAngle, distance);
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
    constructor(id, distance = 0) {
        this.id = id;
        this.label = id;
        this.angle = MathUtils.getRandomAngle();
        this.position = MathUtils.getAngularPosition(this.angle, distance);
        this.type = NodeType.outer_node;
        cy.add(this.toObject()).addClass(this.type.toString());
    }
    remove() {
        cy.remove(cy.getElementById(this.id));
    }
    setDistance(distance) {
        this.position = MathUtils.getAngularPosition(this.angle, distance);
        cy.getElementById(this.id).position(this.position);
    }
    setPosition(position) {
        this.position = position;
        this.angle = Math.atan2(position.y, position.x);
        cy.getElementById(this.id).position(this.position);
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
    constructor(queryTerm, term = '', hops = 0) {
        this.hopToDistanceRatio = 60;
        this.term = term;
        this.hops = hops;
        this.node = new OuterNode(`${getRandomString(8)}`);
        this.node.setDistance(this.toDistance(hops));
        this.node.label = term;
        this.edge = new Edge(queryTerm.node, this.node);
        cy.getElementById(this.node.id).data('label', term);
    }
    toDistance(hops) {
        return hops * this.hopToDistanceRatio;
    }
    updateDistance() {
        this.edge.updateDistance();
    }
    getHops() {
        return (this.edge.getDistance() / this.hopToDistanceRatio).toFixed(1).toString();
    }
    setTerm(term) {
        this.term = term;
        this.node.label = term;
        cy.getElementById(this.node.id).data('label', term);
    }
    setHops(hops) {
        this.hops = hops;
        this.node.setDistance(this.toDistance(hops));
        this.updateDistance();
    }
    remove() {
        this.node.remove();
        this.edge.remove();
    }
}
class QueryTerm {
    constructor(label) {
        this.neighbourTerms = [];
        this.term = label;
        this.node = new CentralNode(label, 0, 0);
    }
    addNeighbourTerm(neighbourTerm) {
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
        const neighbourTerm = new NeighbourTerm(this.queryTerm);
        neighbourTerm.setTerm(term);
        neighbourTerm.setHops(Math.random() * 5);
        this.queryTerm.addNeighbourTerm(neighbourTerm);
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
            cell3.innerHTML = neighbourTerm.getHops();
        }
    }
    getNeighbourTermById(id) {
        return this.queryTerm.neighbourTerms.find(term => term.node.id === id);
    }
    nodeDragged(id, position) {
        const term = this.getNeighbourTermById(id);
        if (term === undefined)
            return;
        const neighbourTerm = term;
        neighbourTerm.node.setPosition(position);
        neighbourTerm.updateDistance();
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
