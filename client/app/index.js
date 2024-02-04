"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    remove() {
        cy.remove(cy.getElementById(this.id));
    }
    setLabel(label) {
        this.label = label;
        cy.getElementById(this.id).data('label', label);
    }
}
class OuterNode {
    constructor(id, distance = 0) {
        this.id = id;
        this.label = id;
        this.position = MathUtils.getAngularPosition(MathUtils.getRandomAngle(), distance);
        this.type = NodeType.outer_node;
        cy.add(this.toObject()).addClass(this.type.toString());
    }
    remove() {
        cy.remove(cy.getElementById(this.id));
    }
    setLabel(label) {
        this.label = label;
        cy.getElementById(this.id).data('label', label);
    }
    setAngle(angle) {
        this.position = MathUtils.getAngularPosition(angle, this.getDistance());
        cy.getElementById(this.id).position(this.position);
    }
    setDistance(distance) {
        this.position = MathUtils.getAngularPosition(MathUtils.getRandomAngle(), distance);
        cy.getElementById(this.id).position(this.position);
    }
    getDistance() {
        return Math.sqrt(this.position.x * this.position.x + this.position.y * this.position.y);
    }
    setPosition(position) {
        this.position = position;
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
    constructor(queryTerm, label = '', hops = 0) {
        this.nodePosition = { x: 0, y: 0 };
        this.hopToDistanceRatio = 60;
        this.queryTerm = queryTerm;
        this.value = label;
        this.hops = hops;
    }
    convertHopsToDistance(hops) {
        return hops * this.hopToDistanceRatio;
    }
    convertDistanceToHops(distance) {
        return distance / this.hopToDistanceRatio;
    }
    getHops() {
        return this.hops;
    }
    setTerm(label) {
        var _a;
        this.value = label;
        (_a = this.node) === null || _a === void 0 ? void 0 : _a.setLabel(label);
    }
    setPosition(position) {
        var _a, _b, _c, _d;
        this.nodePosition = position;
        const nodeDistance = (_b = (_a = this.edge) === null || _a === void 0 ? void 0 : _a.getDistance()) !== null && _b !== void 0 ? _b : 0;
        this.hops = this.convertDistanceToHops(nodeDistance);
        (_c = this.node) === null || _c === void 0 ? void 0 : _c.setPosition(position);
        (_d = this.edge) === null || _d === void 0 ? void 0 : _d.updateDistance();
    }
    setHops(hops) {
        var _a, _b;
        this.hops = hops;
        const nodeDistance = this.convertHopsToDistance(hops);
        this.nodePosition = MathUtils.getRandomAngularPositionWithDistance(nodeDistance);
        (_a = this.node) === null || _a === void 0 ? void 0 : _a.setPosition(this.nodePosition);
        (_b = this.edge) === null || _b === void 0 ? void 0 : _b.updateDistance();
    }
    displayViews() {
        this.node = new OuterNode(getRandomString(6));
        this.node.setPosition(this.nodePosition);
        this.node.label = this.value;
        cy.getElementById(this.node.id).data('label', this.value);
        if (this.queryTerm.node === undefined)
            return;
        this.edge = new Edge(this.queryTerm.node, this.node);
    }
    removeViews() {
        var _a, _b;
        (_a = this.node) === null || _a === void 0 ? void 0 : _a.remove();
        (_b = this.edge) === null || _b === void 0 ? void 0 : _b.remove();
    }
}
class QueryTerm {
    constructor(value) {
        this.neighbourTerms = [];
        this.value = value;
    }
    addNeighbourTerm(neighbourTerm) {
        this.neighbourTerms.push(neighbourTerm);
    }
    displayViews() {
        this.node = new CentralNode(this.value, 0, 0);
        for (let neighbourTerm of this.neighbourTerms) {
            neighbourTerm.displayViews();
        }
    }
    removeViews() {
        var _a;
        for (let neighbourTerm of this.neighbourTerms) {
            neighbourTerm.removeViews();
        }
        (_a = this.node) === null || _a === void 0 ? void 0 : _a.remove();
    }
    setLabel(label) {
        var _a;
        this.value = label;
        (_a = this.node) === null || _a === void 0 ? void 0 : _a.setLabel(label);
    }
    removeNeighbourTerm(neighbourTerm) {
        this.neighbourTerms = this.neighbourTerms.filter(term => term !== neighbourTerm);
        neighbourTerm.removeViews();
    }
    getNeighbourTermById(id) {
        return this.neighbourTerms.find(p => { var _a; return ((_a = p.node) === null || _a === void 0 ? void 0 : _a.id) === id; });
    }
}
function getRandomString(chars) {
    const charsList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < chars; i++) {
        result += charsList.charAt(Math.floor(Math.random() * charsList.length));
    }
    return result;
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
    var _a;
    (_a = queryService.activeQueryTermService) === null || _a === void 0 ? void 0 : _a.nodeDragged(evt.target.id(), evt.target.position());
});
class NeighbourTermList {
    constructor() {
        this.table = document.getElementById('neighboursTermsTable');
    }
    setActiveService(termsService) {
        this.activeTermsService = termsService;
    }
    updateTable() {
        const tbody = this.table.getElementsByTagName('tbody')[0];
        tbody.innerHTML = ''; // Clear existing rows
        if (this.activeTermsService === undefined)
            return;
        for (const neighbourTerm of this.activeTermsService.queryTerm.neighbourTerms) {
            const row = tbody.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            cell1.innerHTML = neighbourTerm.value;
            cell2.innerHTML = neighbourTerm.getHops().toFixed(1);
        }
    }
}
class QueryTermService {
    constructor(queryService, queryTerm) {
        this.isVisible = false;
        this.apiUrl = 'http://localhost:3000/get-neighbour-terms';
        this.queryService = queryService;
        this.queryTerm = queryTerm;
        this.retrieveData();
    }
    retrieveData() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.postData(this.apiUrl, { query: this.queryTerm.value });
            if (result) {
                for (let termObject of result['neighbour_terms']) {
                    const neighbourTerm = new NeighbourTerm(this.queryTerm);
                    neighbourTerm.setTerm(termObject.term);
                    neighbourTerm.setHops(termObject.distance);
                    this.addNeighbourTerm(neighbourTerm);
                }
            }
        });
    }
    postData(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });
                // Handle the response
                const result = yield response.json();
                console.log('Success:', result);
                return result;
            }
            catch (error) {
                console.error('Error:', error);
            }
        });
    }
    addNeighbourTerm(neighbourTerm) {
        this.queryTerm.addNeighbourTerm(neighbourTerm);
        this.queryService.dataWasUpdated();
        if (this.isVisible)
            this.display();
    }
    nodeDragged(id, position) {
        const term = this.queryTerm.getNeighbourTermById(id);
        if (term === undefined)
            return;
        term.setPosition(position);
        this.queryService.dataWasUpdated();
    }
    display() {
        this.isVisible = true;
        this.queryTerm.removeViews();
        this.queryTerm.displayViews();
        this.center();
    }
    deactivate() {
        this.isVisible = false;
        this.queryTerm.removeViews();
    }
    removeNeighbourTerm(id) {
        const term = this.queryTerm.getNeighbourTermById(id);
        if (term === undefined)
            return;
        this.queryTerm.removeNeighbourTerm(term);
        this.queryService.dataWasUpdated();
    }
    center() {
        cy.zoom(1.2);
        if (this.queryTerm.node === undefined)
            return;
        cy.center(cy.getElementById(this.queryTerm.node.id));
    }
}
class Query {
    constructor(query) {
        this.query = '';
        this.queryTerms = [];
        this.query = query;
    }
    setValue(query) {
        this.query = query;
    }
    getValue() {
        return this.query;
    }
    setQueryTerms(queryTerms) {
        this.queryTerms = queryTerms;
    }
    getQueryTerms() {
        return this.queryTerms;
    }
}
class QueryComponent {
    constructor(queryService) {
        this.query = '';
        this.queryService = queryService;
        this.input = document.getElementById('queryInput');
        this.input.addEventListener("keyup", event => {
            if (event.key !== "Enter")
                return;
            event.stopImmediatePropagation();
            this.query = this.input.value.trim();
            this.input.value = '';
            event.preventDefault();
            this.queryService.setQuery(this.query);
        });
    }
}
class QueryTermList {
    constructor(queryService) {
        this.queryService = queryService;
        this.dynamicList = document.getElementById('queryTermsList');
    }
    updateList(queryTerms) {
        this.dynamicList.innerHTML = '';
        queryTerms.forEach(queryTerm => {
            // Create a new list item element
            const listItem = document.createElement("li");
            listItem.textContent = queryTerm.value;
            listItem.addEventListener("click", () => {
                this.queryService.setActiveTermsService(queryTerm.value);
            });
            // Append the list item to the dynamic list container
            this.dynamicList.appendChild(listItem);
        });
    }
}
class QueryService {
    constructor() {
        this.queryTermServices = [];
        this.neighbourTermList = new NeighbourTermList();
        this.queryTermList = new QueryTermList(this);
        this.query = new Query('');
    }
    dataWasUpdated() {
        this.neighbourTermList.updateTable();
    }
    queryGenerationWasRequested() {
        const termService = new QueryTermService(this, new QueryTerm(this.query.getValue()));
        this.queryTermServices = [];
        this.queryTermServices.push(termService);
        // this.decomposeQuery()
        this.queryTermList.updateList(this.queryTermServices.map(termService => termService.queryTerm));
        if (this.queryTermServices.length > 0) {
            this.activeQueryTermService = this.queryTermServices[0];
            this.neighbourTermList.setActiveService(this.activeQueryTermService);
        }
    }
    decomposeQuery() {
        this.queryTermServices = [];
        for (let term of this.query.getValue().split(' ')) {
            const termService = new QueryTermService(this, new QueryTerm(term));
            this.queryTermServices.push(termService);
        }
    }
    setQuery(query) {
        var _a;
        (_a = this.activeQueryTermService) === null || _a === void 0 ? void 0 : _a.deactivate();
        this.query = new Query(query);
        this.queryGenerationWasRequested();
        if (this.queryTermServices.length === 0)
            return;
        this.setActiveTermsService(this.queryTermServices[0].queryTerm.value);
    }
    setActiveTermsService(queryTerm) {
        var _a;
        (_a = this.activeQueryTermService) === null || _a === void 0 ? void 0 : _a.deactivate();
        const queryTermService = this.findQueryTermService(queryTerm);
        if (queryTermService === undefined)
            return;
        this.activeQueryTermService = queryTermService;
        this.activeQueryTermService.display();
        this.neighbourTermList.setActiveService(queryTermService);
        this.dataWasUpdated();
        return;
    }
    findQueryTermService(queryTerm) {
        return this.queryTermServices.find(termService => termService.queryTerm.value === queryTerm);
    }
}
const queryService = new QueryService();
const queryComponent = new QueryComponent(queryService);
cy.ready(() => {
    // queryService.queryTermServices[0].addNeighbourTerm('holaA')
    // queryService.queryTermServices[0].addNeighbourTerm('holaB')
    // queryService.queryTermServices[0].addNeighbourTerm('holaC')
    // queryService.queryTermServices[1].addNeighbourTerm('mundoA')
    // queryService.queryTermServices[1].addNeighbourTerm('mundoB')
    // queryService.queryTermServices[1].addNeighbourTerm('mundoC')
});
let searchTerm = "Graphs";
const mockResults = [
    "Paper 1 about " + searchTerm,
    "Paper 2 related to " + searchTerm,
    "Another paper discussing " + searchTerm,
    "Further findings on " + searchTerm
];
// Display results
const resultsList = document.getElementById('resultsList');
resultsList.innerHTML = ""; // Clear previous results
for (let i = 0; i < mockResults.length; i++) {
    let listItem = document.createElement('li');
    listItem.textContent = (i + 1) + ". " + mockResults[i];
    resultsList.appendChild(listItem);
    listItem.addEventListener("click", () => {
        alert(mockResults[i]);
    });
}
// quick and dirty way to get instances in console
;
window.cy = cy;
window.queryService = queryService;
