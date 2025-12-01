**AWS Load Balancer Practice**

**Step 1: Simple Express project with two endpoints:**

- `GET /` → returns the **ECS task ID** of the running container.
- `GET /health` → used for ALB health checks.
- Deployed to GitHub: https://github.com/cibilex/aws-alb.

**Step 2: Build and Push Docker Image to AWS ECR**

- First, build the Docker image locally using:

```bash
docker build --platform=linux/amd64 -t aws-alb-image .
```

- This ensures the image is compatible with AWS ECS.
- Next, go to the **AWS ECR** console and create a new repository for your application. After the repository is created, push your Docker image to the repository using the instructions provided in the console. Once pushed, the image is ready to be used in ECS task definitions.

**Step 3: Create Security Groups**

- For the ECS setup, create **two security groups**:
    - **load-balancer-sg**: This security group is for the load balancer and should allow **HTTP traffic** from the internet.
    - **ecs-sg**: This security group is for the ECS instances. It should allow **all TCP traffic** originating from the **load-balancer-sg**. There is no need to explicitly allow HTTP or HTTPS, as all communication from the load balancer will already be permitted through TCP.

**Step 4: Create an Application Load Balancer**

- Navigate to **EC2 > Load Balancers > Create Load Balancer** and choose **Application Load Balancer (ALB)**.
- Start by giving your ALB a **unique name**. Then set the **Scheme** to **Internet-facing**, which assigns the load balancer a public IP and allows it to serve as the entry point for external traffic. For the **IP Address Type**, choose **IPv4**.
- Under **Network Mapping**, select the **VPC** where your ECS cluster operates, and choose **two public subnets** across different Availability Zones. Internet-facing ALBs require at least two public subnets to achieve high availability.
- Next, assign the appropriate **Security Group**. Select the **sg-load-balancer** you created earlier, which allows inbound HTTP traffic.
- In the **Listeners & Routing** section, configure an HTTP listener. During creation, you can attach a temporary or placeholder **target group** to satisfy the ALB setup requirements. This is only needed for initialization, because when you create the ECS service later, ECS will reconfigure the listener and target group automatically.
- After the ALB is created, you will **delete the placeholder listener and the initial target group**, as they will no longer be needed.

**Step 5: Create a Task Definition**

- Go to **ECS > Task Definitions > Create**. Configure the following important options:
    - **Launch type**: Select **Amazon EC2** since the tasks will run on EC2 instances.
    - **Task Size**: Set the total task resources. For this example, use **0.25 vCPU** and **0.25 GB** memory.
    - **Network Mode**: Choose **bridge**. This allows ECS to map container ports to dynamically assigned host ports.
    - **Containers**: Add a new container and select your image using the **“Browse ECR images”** button, then choose the `aws-alb-image` you uploaded earlier.
        - **Port Mappings**:
            - **Host port**: Leave this empty so ECS can automatically assign the host port when tasks are placed by the load balancer.
            - **Container port**: Enter **3000**, which is the port your Express application listens on.

**Step 6: Create an ECS Cluster**

- Navigate to **ECS > Clusters > Create Cluster**. Important configuration options include:
- **Compute method**: Choose **Fargate and Self-managed instances**. Selecting this will reveal additional EC2 instance configuration options.
- **VPC and Subnets**: Select your VPC and choose **private subnets** to ensure that ECS tasks are only accessible through the load balancer. Make sure the **Auto-assign Public IP** option is turned off.
- **Security Group**: Select the previously created **sg-ecs**.
- **Desired Capacity**: Set the minimum and maximum number of EC2 instances for the Auto Scaling Group. For example, you can choose **minimum 2** and **maximum 3** instances.

### **Step 7: Create Service**

- Go to **ECS → your cluster → Create service**.
    - **Desired tasks:** Enter how many tasks you want to keep running.
    - **Load balancing:** Select **“Use load balancing”**
        - **VPC:** choose the VPC you created.
        - **Load balancer type:** **Application Load Balancer**
        - **Container:** This will be auto-completed. For example: `aws-alb 3000:3000`
        - Click **“Use an existing load balancer”** and select your **aws-alb** load balancer.
        - **Listener:** Port **80**. This means the ALB listens for HTTP requests. (You can add a 443 listener later.)
        - **Target group:**
            - **Port:** `3000`
            - **Deregistration delay:**Deregistration delay is the time the load balancer waits before fully removing a task from the target group.If the task has no active requests, it is removed immediately.If there are still open or ongoing connections, the load balancer waits for the configured time (in seconds) to let the task finish processing those requests gracefully.
        - **Health check path:** For example `/health`
    - **Service Auto Scaling:** This policy automatically scales your tasks.
        
        You can set **min=2** and **max=3** tasks.
        

![Screenshot 2025-11-25 at 17.22.09.png](attachment:646dccba-2c3d-4f31-89da-11c0c649c377:Screenshot_2025-11-25_at_17.22.09.png)

- Go to **EC2 → Load Balancers** → select your ALB. Copy the **DNS name** (e.g., `aws-alb-1041041893.eu-north-1.elb.amazonaws.com`). Open it in browser with **http**. You should see the app response.**Refreshing the page should show different task IDs**, confirming ALB is distributing traffic across ECS tasks.
