// web/prisma/seed.mjs
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('demo1234', 10)

    await prisma.usuario.upsert({
        where: { username: 'demo1234' },
        update: {},
        create: {
            username: 'demo1234',
            password: hashedPassword,
            nombre: 'Demo User Flujo',
        },
    })

    console.log('✅ Usuario seed creado/actualizado')
}

main()
    .catch((e) => {
        console.error('❌ Seed error:\n', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
