// web/prisma/seed.mjs
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('akilesyboby', 10)

    await prisma.usuario.upsert({
        where: { username: 'elvislc' },
        update: {},
        create: {
            username: 'elvislc',
            password: hashedPassword,
            nombre: 'Elvis Lazaro',
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
