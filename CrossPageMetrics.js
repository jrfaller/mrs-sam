var mong_client = require('mongodb').MongoClient;

class CrossPageMetrics {
    constructor(mongoServer) {
        this.db_url = `mongodb://${mongoServer}:27017/mrssam`;
        this.cpm = new CrossPageMatrix();
        this.cocitations = undefined;
        this.couplings = undefined;
    }

    start() {
        mong_client.connect(this.db_url, (err, db) => {
            if (err) {
                throw new Error(err);
            } else {
                this.db = db;
                console.log("CrossPageMetrics is running!");
                this.fetchEntries();
            }
        });
    }

    fetchEntries() {
        this.db.collection('TestedPage', (err, pageColl) => {
            var cursor = pageColl.find().each((err, page) => {
                if (page) {
                    console.log("ADD ENTRY: " + page.url);
                    this.cpm.addEntry(page.url);
                } else {
                    console.log("ENTRIES ARE FETCHED !!!!!!")
                    this.fetchReferences();
                }
            });
        });
    }


    fetchReferences() {
        this.cpm.initMatrix();
        this.db.collection('TestedPage', (err, pageColl) => {
            var cursor = pageColl.find().each((err, page) => {
                if (page) {
                    page.hrefs.forEach(href => {
                        try {
                            this.cpm.addRef(page.url, href);
                            console.log(`ADD : ${page.url} -> ${href}`);
                        } catch (err) {
                            //don't care, href outside of the domain
                            //console.log(err);
                        }
                    });
                } else {
                    console.log("no more ref to fetch");
                    this.db.close();
                    this.computeMetrics();
                }
            });
        });
    }


    computeMetrics() {
        this.cocitations = new Matrix2D(this.cpm.size());
        this.couplings = new Matrix2D(this.cpm.size());

        for (var i = 0; i < this.cpm.size(); i++) {
            for (var j = 0; j < this.cpm.size(); j++) {
                this.cocitations.set(i, j, this.cpm.getCoCitation(this.cpm.entries[i], this.cpm.entries[j]));
                this.couplings.set(i, j, this.cpm.getCoupling(this.cpm.entries[i], this.cpm.entries[j]));
            }
        }
        console.log("metrics are computed");
    }
}


class CrossPageMatrix {
    constructor() {
        this.entries = [];
    }

    size() {
        return this.entries.length;
    }

    addEntry(url) {
        if (this.entries.indexOf(url) === -1) {
            this.entries.push(url);
        }
    }

    initMatrix() {
        this.refMatrix = new Matrix2D(this.entries.length);
    }

    addRef(fromURL, toURL) {
        if (this.refMatrix === undefined) {
            throw new Error('You should call initMatrix() before addRef()')
        } else {
            var fromID = this.entries.indexOf(fromURL);
            var toID = this.entries.indexOf(toURL);
            if ((fromID !== -1) && (toID !== -1)) {
                this.refMatrix.set(fromID, toID, 1);
            } else {
                throw new Error('One of the two URL has not been added to the entries');
            }
        }
    }

    getCoCitation(urlI, urlJ) {
        if (this.refMatrix === undefined) {
            throw new Error('No Matrix, No Ref, no Co-Citation !')
        } else {
            var iID = this.entries.indexOf(urlI);
            var jID = this.entries.indexOf(urlJ);
            if ((iID !== -1) && (jID !== -1)) {
                var iRow = this.refMatrix.row(iID);
                var jRow = this.refMatrix.row(jID);
                var cocitation = 0
                for (var i = 0; i < iRow.length; i++) {
                    cocitation = cocitation + iRow[i] * jRow[i];
                }
                return cocitation;
            } else {
                throw new Error('One of the two URL has not been added to the entries');
            }
        }
    }

    getCoupling(urlI, urlJ) {
        if (this.refMatrix === undefined) {
            throw new Error('No Matrix, No Ref, no Co-Citation !')
        } else {
            var iID = this.entries.indexOf(urlI);
            var jID = this.entries.indexOf(urlJ);
            if ((iID !== -1) && (jID !== -1)) {
                var iCol = this.refMatrix.column(iID);
                var jCol = this.refMatrix.column(jID);
                var coupling = 0
                for (var i = 0; i < iCol.length; i++) {
                    coupling = coupling + iCol[i] * jCol[i];
                }
                return coupling;
            } else {
                throw new Error('One of the two URL has not been added to the entries');
            }
        }
    }
}

class Matrix2D {
    constructor(size) {
        this.size = size;
        this.matrix = [];
        for (var i = 0; i < size; i++) {
            var row = [];
            for (var j = 0; j < size; j++) {
                row.push(0);
            }
            this.matrix.push(row);
        }
    }

    set(x, y, val) {
        this.matrix[x][y] = val;
    }

    get(x, y) {
        return this.matrix[x][y];
    }

    row(x) {
        return this.matrix[x];
    }

    column(y) {
        var result = [];
        for (var i = 0; i < this.size; i++) {
            result.push(this.matrix[i][y]);
        }
        return result;
    }
}


module.exports.CrossPageMetrics = CrossPageMetrics;
