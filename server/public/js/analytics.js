const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const analyticsDataClient = new BetaAnalyticsDataClient();

async function getAnalyticsUsers() {
    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${process.env.PROPERTY_ID}`, // Usa el Property ID
            dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
            metrics: [{ name: 'activeUsers' }], // Métrica para usuarios activos
            dimensions: [{ name: 'date' }], // Dimensión para la fecha
        });

        const data = response.rows.map(row => ({
            fecha: row.dimensionValues[0].value, // Fecha
            usuarios: parseInt(row.metricValues[0].value), // Usuarios activos
        }));

        return data;
    } catch (error) {
        console.error('Error en getAnalyticsUsers:', error);
        throw error;
    }
}

module.exports = { getAnalyticsUsers }; // Exporta la función