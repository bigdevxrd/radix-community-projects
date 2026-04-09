# On-Chain Proposal Outcome Recording Feature Documentation

## Overview
This document outlines the documentation for the on-chain proposal outcome recording feature of the Radix Community Projects.

## Architecture
The architecture consists of a decentralized application (DApp) that interacts with the Radix public ledger to record proposal outcomes.

## How It Works (Step-by-Step)
1. **Proposal Creation**: Users create a proposal via the DApp which gets stored on the on-chain ledger.
2. **Voting Process**: Community members vote on the proposal.
3. **Outcome Calculation**: At the end of the voting period, the system calculates the outcome based on the votes.
4. **Outcome Recording**: The result is recorded on-chain through the API endpoints.

## Database Schema
- **outcomes**  
  - **id** (integer, primary key)  
  - **proposal_id** (integer, foreign key)  
  - **outcome** (string)  
  - **recorded_at** (timestamp)  
  
- **votes**  
  - **id** (integer, primary key)  
  - **outcome_id** (integer, foreign key)  
  - **voter_id** (string)  
  - **vote_value** (string)  

## API Endpoints
### GET /api/outcomes-queue
- Fetches the current ongoing outcome queue.

**Response Example**:
```json
[
   {
       "id": 1,
       "proposal_id": 123,
       "outcome": "Approved",
       "recorded_at": "2026-04-04T10:00:00Z"
   }
]
```

### POST /api/outcomes-queue/:id/mark-recorded
- Marks the specified outcome as recorded.

**Request Example**:
```json
{
   "status": "recorded"
}
```

**Response Example**:
```json
{
   "message": "Outcome recorded successfully.",
   "data": {
       "id": 1,
       "proposal_id": 123,
       "outcome": "Approved"
   }
}
```

## Outcome JSON Format
```json
{
   "id": 1,
   "proposal_id": 123,
   "outcome": "Approved",
   "recorded_at": "2026-04-04T10:00:00Z"
}
```

## Setup Instructions
### Environment Variables
- **RADIX_NODE_URL**: URL of the Radix node.
- **DATABASE_URL**: Database connection string.

### Running Manually
Run the application with the command: `node index.js`

### PM2 Setup
Use PM2 for process management:  
```bash
pm install pm2 -g
pm start
```

## Security Considerations
- Ensure all incoming requests are validated.
- Use HTTPS for all endpoints.
- Implement rate limiting on the APIs.

## Verification Steps
1. Simulate proposal creation and voting.
2. Call the API endpoints and check outcomes.
3. Confirm that outcomes are recorded on-chain as expected.

## Troubleshooting
- Check the logs for errors while recording outcomes.
- Verify that the database is properly connected.

## Future Enhancements
- Integrate user authentication for secure access.
- Add analytics to track proposal engagement and voting behavior.