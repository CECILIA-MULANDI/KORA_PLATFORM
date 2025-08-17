import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class IoTDataReader {
  constructor() {
    this.csvPath = path.join(__dirname, '../cleaned_data.csv');
    this.data = [];
    this.currentIndex = 0;
    this.loadData();
  }

  // Load CSV data into memory
  loadData() {
    try {
      const csvContent = fs.readFileSync(this.csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const [timestamp, latitude, longitude, speed_kmh] = line.split(',');
          this.data.push({
            timestamp: parseInt(timestamp),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            speed_kmh: parseFloat(speed_kmh),
            rowIndex: i
          });
        }
      }
      
      console.log(`📊 Loaded ${this.data.length} IoT data points from CSV`);
    } catch (error) {
      console.error('❌ Error loading CSV data:', error.message);
    }
  }

  // Get next data point (simulates real-time streaming)
  getNextDataPoint(deviceId) {
    if (this.currentIndex >= this.data.length) {
      this.currentIndex = 0; // Loop back to start
    }

    const dataPoint = this.data[this.currentIndex];
    this.currentIndex++;

    return {
      deviceId: deviceId,
      timestamp: dataPoint.timestamp,
      location: {
        latitude: dataPoint.latitude,
        longitude: dataPoint.longitude
      },
      speed_kmh: dataPoint.speed_kmh,
      rawData: dataPoint
    };
  }

  // Get all anomalies (speed > 180 km/h) from the dataset
  getAllAnomalies() {
    return this.data.filter(point => point.speed_kmh > 180);
  }

  // Get data points in a time range
  getDataInRange(startTime, endTime) {
    return this.data.filter(point => 
      point.timestamp >= startTime && point.timestamp <= endTime
    );
  }

  // Get random data point (for testing)
  getRandomDataPoint(deviceId) {
    const randomIndex = Math.floor(Math.random() * this.data.length);
    const dataPoint = this.data[randomIndex];

    return {
      deviceId: deviceId,
      timestamp: dataPoint.timestamp,
      location: {
        latitude: dataPoint.latitude,
        longitude: dataPoint.longitude
      },
      speed_kmh: dataPoint.speed_kmh,
      rawData: dataPoint
    };
  }

  // Simulate continuous data streaming
  startDataStream(deviceId, intervalMs = 5000, callback) {
    console.log(`🚗 Starting data stream for device: ${deviceId}`);
    
    const streamInterval = setInterval(() => {
      const dataPoint = this.getNextDataPoint(deviceId);
      callback(dataPoint);
    }, intervalMs);

    return streamInterval; // Return interval ID so it can be stopped
  }

  // Get statistics about the dataset
  getDataStats() {
    const speeds = this.data.map(point => point.speed_kmh);
    const anomalies = this.getAllAnomalies();
    
    return {
      totalPoints: this.data.length,
      maxSpeed: Math.max(...speeds),
      minSpeed: Math.min(...speeds),
      avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      anomalyCount: anomalies.length,
      anomalyPercentage: (anomalies.length / this.data.length * 100).toFixed(2)
    };
  }
}

export default IoTDataReader;
