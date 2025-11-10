import { PrismaClient } from "@prisma/client";

const globalForPrisma=globalThis;

export const prisma=globalForPrisma._prisma || new PrismaClient();

if (process.env.NODE_ENV!=='production'){
        globalForPrisma._prisma=prisma;
}

const shutdown = async(signal)=>{
    try{
        await prisma.$disconnect();
    }finally{
        process.exit(0);
    }
}

if (!globalForPrisma._prismaHandlersAttached){
    process.on('SIGINT',()=>shutdown('SIGINT'));
    process.on('SIGTERM',()=>shutdown('SIGTERM'));
    process.on('beforeExit',async()=>{
        await prisma.$disconnect();
    });
    globalForPrisma._prismaHandlersAttached=true;
}

export default prisma;