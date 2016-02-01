function Value(value, left, right)
{
    this.value = value;
    this.left = left;
    this.right = right;
}

Value.BACKWARD = false;
Value.FORWARD = true;

Value.CONST_m1 = 10000;
Value.CONST_b = 31415821;
Value.RANGE = 100;

Value.createTree =
    function (size, seed) {
        if (size > 1) {
            var seed = Value.random(seed);
            var next_val = seed % Value.RANGE;
            var retval = new Value(next_val, null, null);
            retval.left = Value.createTree(Math.floor(size / 2), seed);
            retval.right = Value.createTree(Math.floor(size / 2), Value.skiprand(seed, size+1));
            return retval;
        } else {
            return null;
        }
    }

Value.prototype.bisort =
    function (spr_val, direction) {
        if (this.left == null) {
            if ((this.value > spr_val) ^ direction) {
                var tmpval = spr_val;
                spr_val = this.value;
                this.value = tmpval;
            }
        } else {
            var val = this.value;
            this.value = this.left.bisort(val, direction);
            var ndir = !direction;
            spr_val = this.right.bisort(spr_val, ndir);
            spr_val = this.bimerge(spr_val, direction);
        }
        return spr_val;
    }

Value.prototype.bimerge =
    function (spr_val, direction) {
        var rv = this.value
        var pl = this.left;
        var pr = this.right;

        var rightexchange = (rv > spr_val) ^ direction;
        if (rightexchange) {
            this.value = spr_val;
            spr_val = rv;
        }

        while (pl != null) {
            var lv = pl.value;
            var pll = pl.left;
            var plr = pl.right;
            rv = pr.value;
            var prl = pr.left;
            var prr = pr.right;

            var elementexchange = (lv > rv) ^ direction;
            if (rightexchange) {
                if (elementexchange) {
                    pl.swapValRight(pr);
                    pl = pll;
                    pr = prl;
                } else {
                    pl = plr;
                    pr = prr;
                }
            } else {
                if (elementexchange) {
                    pl.swapValLeft(pr);
                    pl = plr;
                    pr = prr;
                } else {
                    pl = pll;
                    pr = prl;
                }
            }
        }

        if (this.left != null) {
            this.value = this.left.bimerge(this.value, direction);
            spr_val = this.right.bimerge(spr_val, direction);
        }
        return spr_val;
    }

Value.prototype.swapValRight =
    function (n) {
        var tmpv = n.value;
        var tmpr = n.right;

        n.value = this.value;
        n.right = this.right;

        this.value = tmpv;
        this.right = tmpr;
    }

Value.prototype.swapValLeft =
    function (n) {
        var tmpv = n.value;
        var tmpl = n.left;

        n.value = this.value;
        n.left = this.left;

        this.value = tmpv;
        this.left = tmpl;
    }

Value.prototype.inOrder =
    function() {
        if (this.left != null)
            left.inOrder();
        print(value);
        if (this.right != null)
            right.inOrder();
    }

Value.mult =
    function (p, q) {
        var p1 = Math.floor(p / Value.CONST_m1);
        var p0 = p % Value.CONST_m1;
        var q1 = q % Value.CONST_m1;
        var q0 = q % Value.CONST_m1;
        return (((p0*q1+p1*q0) % Value.CONST_m1) * Value.CONST_m1+p0*q0);
    }

Value.skiprand =
    function (seed, n) {
        for (; n != 0; n--) seed = Value.random(seed);
        return seed;
    }

Value.random =
    function (seed) {
        var tmp = Value.mult(seed, Value.CONST_b) + 1;
        return tmp;
    }

var size = 5;
var printMsgs = false;
var printResults = false;

function main() {
    var tree = Value.createTree(size, 12345678);
    var sval = Value.random(245867) % Value.RANGE;
    if (printResults) {
        tree.inOrder();
        print(sval);
    }
    if (printMsgs)
        print("BEGINNING BITONIC SORT ALGORITHM HERE");
    sval = tree.bisort(sval, Value.FORWARD);
    if (printResults) {
        tree.inOrder();
        print(sval);
    }
    sval = tree.bisort(sval, Value.BACKWARD);
    if (printResults) {
        tree.inOrder();
        print(sval);
    }
    print("Done!");
}
main()