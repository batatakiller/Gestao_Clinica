import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { number, text } = await request.json();

    if (!number || !text) {
      return NextResponse.json(
        { error: 'Missing number or text' },
        { status: 400 }
      );
    }

    const EVO_URL = process.env.EVO_URL;
    const EVO_KEY = process.env.EVO_KEY;
    const EVO_INSTANCE = process.env.EVO_INSTANCE;

    if (!EVO_URL || !EVO_KEY || !EVO_INSTANCE) {
        return NextResponse.json(
            { error: 'Evolution API Server configuration is missing.' },
            { status: 500 }
        );
    }

    // Preparar o número (remover caracteres sujos e injetar DDI)
    let safeNumber = number.replace(/\D/g, '');
    if (!safeNumber.startsWith('55')) {
        safeNumber = '55' + safeNumber;
    }

    const response = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_KEY,
      },
      body: JSON.stringify({
        number: safeNumber,
        options: {
            delay: 1200, // Dá um delayzinho humano para não parecer robô demais
            presence: 'composing' // Mostra "digitando..." lá pro cliente
        },
        textMessage: {
            text: text
        }
      }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Evolution API Error:", errorData);
        return NextResponse.json(
            { error: 'Failed to send message via Evolution API', details: errorData },
            { status: response.status }
        );
    }

    const resData = await response.json();
    return NextResponse.json({ success: true, data: resData });

  } catch (error) {
    console.error('API Chat Send Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
