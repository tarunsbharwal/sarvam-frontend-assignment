export const createMockStreamingResponse = (prompt: string, shouldFail: boolean = false): Response => {
  const sampleResponse = `This is a simulated response to: "${prompt}". 
In a real application, this would stream from an actual model endpoint. 
We are demonstrating token-by-token streaming capabilities with live metrics. 
The system tracks tokens per second and gracefully handles errors.
Sarvam AI is building foundational AI models and platforms.
Here are more tokens to simulate a longer, realistic generation process.
Notice how the UI remains responsive and metrics update in real-time.`;

  const tokens = sampleResponse.split(/(\s+)/); // Keep whitespace as tokens
  
  const stream = new ReadableStream({
    async start(controller) {
      // Simulate network delay before first token
      await new Promise(resolve => setTimeout(resolve, 500));

      for (let i = 0; i < tokens.length; i++) {
        if (shouldFail && i === Math.floor(tokens.length / 2)) {
          controller.error(new Error("Network connection dropped mid-stream."));
          return;
        }

        // Simulate token generation time (variable delay)
        const delay = Math.random() * 50 + 20; 
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Enqueue the token as a Uint8Array
        controller.enqueue(new TextEncoder().encode(tokens[i]));
      }
      
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain' }
  });
};

// We intercept the global fetch to route requests to our mock
export const setupMockFetch = () => {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input === '/api/inference') {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      return createMockStreamingResponse(body.prompt || "", body.shouldFail);
    }
    return originalFetch(input, init);
  };
};
