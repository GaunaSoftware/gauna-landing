  } catch (error: any) {
    console.error('[API beta-signup] Error completo:', error);
    console.error('[API beta-signup] Mensaje:', error?.message);
    console.error('[API beta-signup] Stack:', error?.stack);

    return new Response(
      JSON.stringify({
        error: error?.message || 'Error al procesar la solicitud. Inténtalo de nuevo en unos minutos.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
