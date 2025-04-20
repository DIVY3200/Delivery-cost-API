const express = require('express');
const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// Product data with weights
const centerProducts = {
    C1: [{ product: "A", weight: 3 }, { product: "B", weight: 2 }, { product: "C", weight: 8 }],
    C2: [{ product: "D", weight: 12 }, { product: "E", weight: 25 }, { product: "F", weight: 15 }],
    C3: [{ product: "G", weight: 0.5 }, { product: "H", weight: 1 }, { product: "I", weight: 2 }]
};

// Accurate distances (bidirectional)
const distances = {
    "C1-L1": 4,
    "C2-L1": 2.5,
    "C3-L1": 2,
    "L1-C1": 4,
    "L1-C2": 2.5,
    "L1-C3": 2
};

// Cost rules
const costPerWeight = [
    { maxWeight: 5, costPerUnitDistance: 10 },
    { maxWeight: Infinity, costPerUnitDistance: 8 }
];

function getCostRate(weight) {
    for (let rule of costPerWeight) {
        if (weight <= rule.maxWeight) return rule.costPerUnitDistance;
    }
    return costPerWeight[costPerWeight.length - 1].costPerUnitDistance;
}

function calculateDeliveryCost(fromCenter, order, orderMap) {
    let totalWeight = 0;
    const available = centerProducts[fromCenter];

    for (let { product, weight } of available) {
        if (order[product] && order[product] > 0) {
            totalWeight += weight * order[product];
            orderMap[product] = 0;
        }
    }

    if (totalWeight === 0) return 0;

    const toL1 = distances[`${fromCenter}-L1`];
    const rate = getCostRate(totalWeight);
    return toL1 * rate;
}

function getAllRoutes(centers) {
    const routes = [];

    const permute = (arr, l, r) => {
        if (l === r) {
            routes.push([...arr]);
        } else {
            for (let i = l; i <= r; i++) {
                [arr[l], arr[i]] = [arr[i], arr[l]];
                permute(arr, l + 1, r);
                [arr[l], arr[i]] = [arr[i], arr[l]];
            }
        }
    };

    permute(centers, 0, centers.length - 1);
    return routes;
}

function calculateMinimumCost(order) {
    const productToCenter = {};
    for (let center in centerProducts) {
        for (let { product } of centerProducts[center]) {
            productToCenter[product] = center;
        }
    }

    const centersNeeded = new Set();
    for (let product in order) {
        if (order[product] > 0) {
            const center = productToCenter[product];
            centersNeeded.add(center);
        }
    }

    const centerList = Array.from(centersNeeded);
    const routes = getAllRoutes(centerList);
    let minCost = Infinity;

    for (let route of routes) {
        let cost = 0;
        const orderCopy = { ...order };

        // First pickup center
        const firstCenter = route[0];
        cost += calculateDeliveryCost(firstCenter, orderCopy, orderCopy);

        // For each additional center
        for (let i = 1; i < route.length; i++) {
            const from = route[i];

            // L1 → from (empty trip)
            const leg = `L1-${from}`;
            const emptyTripCost = distances[leg] * getCostRate(0);
            cost += emptyTripCost;

            // from → L1 with products
            cost += calculateDeliveryCost(from, orderCopy, orderCopy);
        }

        minCost = Math.min(minCost, cost);
    }

    return minCost;
}


app.post('/calculate-delivery-cost', (req, res) => {
    const order = req.body;
    const cost = calculateMinimumCost(order);
    res.json({ cost });
});

app.listen(port, () => {
    console.log(`🚚 API is running on port ${port}`);
});
