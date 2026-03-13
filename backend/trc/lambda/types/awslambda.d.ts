declare namespace awslambda {
  function streamifyResponse(
    handler: (event: any, responseStream: any) => Promise<void>
  ): any;
}
