import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class CallGateway {
  @WebSocketServer()
  server: Server;

  private userSocketMap = new Map<string, string>();

  @SubscribeMessage('join')
  handleJoin(@MessageBody() userId: string, @ConnectedSocket() client: Socket) {
    // Store the mapping of userId to socketId
    this.userSocketMap.set(userId, client.id);
    client.join(userId);
    console.log(`User ${userId} joined with socket ${client.id}`);
  }

  @SubscribeMessage('call-user')
  handleCallUser(
    @MessageBody() data: { 
      to: string; 
      from: string; 
      signal: any; 
      type: 'video' | 'audio';
      callerName?: string;
      callerImage?: string;
    },
    @ConnectedSocket() client: Socket
  ) {
    console.log(`Call from ${data.from} to ${data.to}, type: ${data.type}`);
    
    // Get the socket ID for the target user
    const targetSocketId = this.userSocketMap.get(data.to);
    
    if (targetSocketId) {
      console.log(`Found target socket: ${targetSocketId}`);
    } else {
      console.log(`Target user ${data.to} not found in socket map`);
    }
    
    // Forward the call request to the target user
    this.server.to(data.to).emit('incoming-call', {
      from: data.from,
      signal: data.signal,
      type: data.type,
      callerName: data.callerName,
      callerImage: data.callerImage
    });
  }

  @SubscribeMessage('answer-call')
  handleAnswerCall(
    @MessageBody() data: { to: string; signal: any },
    @ConnectedSocket() client: Socket
  ) {
    console.log(`Call answered by ${client.id} to ${data.to}`);
    
    // Forward the answer to the caller
    this.server.to(data.to).emit('call-answered', {
      signal: data.signal
    });
  }

  @SubscribeMessage('reject-call')
  handleRejectCall(
    @MessageBody() data: { to: string },
    @ConnectedSocket() client: Socket
  ) {
    console.log(`Call rejected by ${client.id} to ${data.to}`);
    
    // Notify the caller that the call was rejected
    this.server.to(data.to).emit('call-rejected');
  }

  @SubscribeMessage('end-call')
  handleEndCall(
    @MessageBody() data: { to: string },
    @ConnectedSocket() client: Socket
  ) {
    console.log(`Call ended by ${client.id} to ${data.to}`);
    
    // Notify the other party that the call has ended
    this.server.to(data.to).emit('call-ended');
  }
}