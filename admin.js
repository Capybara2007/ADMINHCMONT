
async function changeStatus(id, status) {
  const questions = {
    "Potvrđen": "Da li želiš da potvrdiš ovaj termin?",
    "Odbijen": "Da li želiš da odbiješ ovaj zahtev?",
    "Završen": "Da li je posao završen?"
  };

  if (!confirm(questions[status])) return;

  const changes = { status };

  if (status === "Završen") {
    changes.datum_zavrsetka = new Date().toISOString();
  }

  const { error } = await db
    .from("termini")
    .update(changes)
    .eq("id", id);

  if (error) {
    console.error(error);
    message(
      "dashboardMessage",
      "Promena nije uspela. Proveri dozvole i RLS pravila.",
      "error"
    );
    return;
  }

  // Osvežavamo podatke jer je status već promenjen.
  await loadAppointments();

  // Mejl se šalje samo kod potvrde ili odbijanja.
  if (status === "Potvrđen" || status === "Odbijen") {
    message("dashboardMessage", "Status je promenjen. Šalje se mejl...");

    const { data: { session } } = await db.auth.getSession();

    if (!session) {
      message(
        "dashboardMessage",
        "Status je promenjen, ali nema aktivne prijave za slanje mejla.",
        "error"
      );
      return;
    }

    const { data, error: mailError } = await db.functions.invoke(
      "posalji-email",
      {
        body: {
          id: Number(id),
          status: status
        }
      }
    );

    if (mailError || data?.error) {
      console.error("Greška pri slanju mejla:", mailError || data);

      message(
        "dashboardMessage",
        "Status je promenjen, ali mejl nije potvrđeno poslat. Proveri Edge Function i Resend.",
        "error"
      );
      return;
    }

    message(
      "dashboardMessage",
      "Status je promenjen i zahtev za slanje mejla je uspešno obrađen.",
      "success"
    );

    return;
  }

  message(
    "dashboardMessage",
    "Posao je označen kao završen. Datum završetka je sačuvan.",
    "success"
  );
}
