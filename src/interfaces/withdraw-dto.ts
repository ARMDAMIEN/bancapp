export interface WithdrawDTO {
    id : number | string;
    destinationAddress : string,
    username : string,
    amount: number,
    completed: boolean,
    createdAt: string,
    completedAt : string
}
