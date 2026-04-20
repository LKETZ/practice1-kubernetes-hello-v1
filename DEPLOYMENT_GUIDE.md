# Node.js API with MongoDB on Kubernetes

## Setup Instructions

This project demonstrates a complete Kubernetes deployment with a Node.js API and MongoDB with persistent storage.

### Prerequisites

- Docker
- Kubernetes cluster (Docker Desktop, Minikube, or any K8s cluster)
- kubectl CLI
- Helm 3 (optional, but we use it)

### Step 1: Build and Push Docker Image

```bash
# Build the Docker image
docker build -t node-hello:v3 .

# For Minikube/Docker Desktop local development:
# The image is built locally and can be used with imagePullPolicy: Never
```

### Step 2: Deploy MongoDB

```bash
# Deploy MongoDB with persistent storage
kubectl apply -f mongodb-deployment.yaml

# Check MongoDB deployment
kubectl get pods -l app=mongodb
kubectl get pvc
kubectl get svc mongodb-service
```

**Verify MongoDB is running:**

```bash
kubectl logs -f deployment/mongodb
```

Wait for the message: "MongoDB connection closed" or similar initialization completion.

### Step 3: Deploy Node.js API using Helm

```bash
# Update Helm dependencies and deploy
cd node-app-chart
helm install node-api . -n default

# Verify deployment
kubectl get pods -l app=node-hello
kubectl get svc node-hello-deployment
```

### Step 4: Verify Deployment

```bash
# Check all pods
kubectl get pods

# Expected output:
# NAME                                    READY   STATUS    RESTARTS   AGE
# mongodb-xxxx                           1/1     Running   0          2m
# node-hello-deployment-xxx              1/1     Running   0          1m
# node-hello-deployment-yyy              1/1     Running   0          1m
```

---

## Task 1: Basic - Screenshot of Pods

```bash
kubectl get pods
```

You should see:

- 2 API replicas (node-hello-deployment-xxx)
- 1 MongoDB pod

---

## Task 2: Intermediate - Query API for Year 2564

### Get the API service port:

```bash
kubectl get svc node-hello-deployment
kubectl port-forward svc/node-hello-deployment 3000:3000 &
```

### Query the API:

```bash
# Get all events
curl http://localhost:3000/events | jq

# Query events for year 2564
curl http://localhost:3000/events?year=2564 | jq
```

**Expected JSON Response:**

```json
{
  "year": 2564,
  "count": 2,
  "events": [
    {
      "_id": "...",
      "year": 2564,
      "name": "Event C",
      "description": "Third event"
    },
    {
      "_id": "...",
      "year": 2564,
      "name": "Event D",
      "description": "Fourth event"
    }
  ],
  "pod": "node-hello-deployment-xxx",
  "timestamp": "2026-04-20T10:30:45.123Z"
}
```

---

## Task 3: Observability - View API Logs

```bash
# Get pod names
kubectl get pods -l app=node-hello

# View logs from specific pod
kubectl logs -f <pod-name>

# Expected log output showing startup sequence:
# [2026-04-20T10:30:45.123Z] Attempting to connect to MongoDB at: mongodb-service:27017
# [2026-04-20T10:30:45.456Z] MongoDB connected successfully
# [2026-04-20T10:30:45.789Z] Connected to database: myapp
# [2026-04-20T10:30:46.012Z] Server is listening on port 3000
# [2026-04-20T10:30:46.345Z] Pod Name: node-hello-deployment-abc123
```

---

## Task 4: Resilience - Delete MongoDB Pod

### Test Data Persistence:

```bash
# 1. Query API to confirm data exists
curl http://localhost:3000/events?year=2564 | jq

# 2. Get MongoDB pod name
MONGO_POD=$(kubectl get pods -l app=mongodb -o jsonpath='{.items[0].metadata.name}')
echo $MONGO_POD

# 3. Delete the MongoDB pod
kubectl delete pod $MONGO_POD

# 4. Watch for new pod creation
kubectl get pods -w

# 5. Wait for MongoDB to restart (check logs)
kubectl logs -f $MONGO_POD  # or new pod name

# 6. Query API again
sleep 10  # Wait for connection to re-establish
curl http://localhost:3000/events?year=2564 | jq
```

### Why Does Data Persist?

**Answer:**

- **PersistentVolumeClaim (PVC)**: MongoDB data is stored in a PVC named `mongodb-pvc`
- **Storage Layer**: When the pod is deleted, the PVC remains intact with all data
- **New Pod Mount**: When Kubernetes creates a new MongoDB pod, it mounts the same PVC
- **Data Preservation**: All previously stored data is immediately available to the new pod
- **No Data Loss**: The data directory `/data/db` is preserved across pod restarts

---

## Task 5: Networking - Why Use mongodb-service Hostname?

### Why NOT use IP addresses:

```bash
# Get MongoDB Service details
kubectl get svc mongodb-service
kubectl describe svc mongodb-service
```

### Why Use Kubernetes Service Names (mongodb-service):

1. **Service Discovery**: Kubernetes DNS automatically resolves `mongodb-service` to the correct IP

   ```
   mongodb-service -> 10.0.0.x (automatically resolved by Kubernetes DNS)
   ```

2. **Dynamic IPs**: Pod IPs are ephemeral (temporary)
   - Pod gets deleted → New IP assigned
   - Hardcoded IP in connection string breaks
   - Service stays the same; IP changes are automatic

3. **Load Balancing**: Service provides load balancing for multiple replicas

   ```
   mongodb-service -> Pod 1
                   -> Pod 2 (if replicas > 1)
   ```

4. **Internal DNS**: Kubernetes has built-in DNS (CoreDNS)

   ```
   mongodb-service -> mongodb-service.default.svc.cluster.local
   (shortened to: mongodb-service:27017)
   ```

5. **Failover & High Availability**:
   - If MongoDB pod dies, new one is created
   - Kubernetes updates DNS automatically
   - API continues working without code changes

### Example MONGO_URI Construction:

```bash
MONGO_URI=mongodb://admin:password123@mongodb-service:27017/myapp?authSource=admin
                                     ^^^^^^^^^^^^^^^^
                                     Service Name (not IP!)
```

---

## Cleanup

```bash
# Delete everything
helm uninstall node-api
kubectl delete -f mongodb-deployment.yaml

# Verify cleanup
kubectl get pods
kubectl get pvc
kubectl get svc
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐         ┌──────────────────┐       │
│  │  Service: node- │         │ Service: mongodb │       │
│  │  hello-deploy   │         │ -service         │       │
│  │  (NodePort)     │         │ (ClusterIP)      │       │
│  └────────┬────────┘         └────────┬─────────┘       │
│           │                            │                 │
│  ┌────────▼────────┐        ┌─────────▼────────┐       │
│  │  Pod Replica 1  │        │  MongoDB Pod     │       │
│  │  (API Server)   │        │  (27017)         │       │
│  └─────────────────┘        └─────────┬────────┘       │
│                                        │                 │
│  ┌─────────────────┐                  │                 │
│  │  Pod Replica 2  │         ┌────────▼────────┐       │
│  │  (API Server)   │         │   PersistentVol │       │
│  └─────────────────┘         │   (mongo-pvc)   │       │
│                               └─────────────────┘       │
│                                                           │
└─────────────────────────────────────────────────────────┘

Connections:
- API Pods → mongodb-service (Kubernetes DNS resolves to MongoDB Pod)
- mongodb-service → MongoDB Pod (Service discovery)
- MongoDB Pod → PersistentVolume (Data storage)
```

---

## Troubleshooting

### MongoDB Connection Failed

```bash
kubectl logs deployment/mongodb
kubectl logs deployment/node-hello-deployment
```

### API not responding

```bash
kubectl describe pod <pod-name>
kubectl get events
```

### Data not persisting

```bash
kubectl get pvc
kubectl describe pvc mongodb-pvc
```

### Service discovery issues

```bash
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
nslookup mongodb-service
```
