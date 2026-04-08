const PracticalDetails = () => (
  <section className="py-16 md:py-20 px-4 bg-primary text-primary-foreground">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-2xl md:text-3xl font-bold mb-8">איך זה עובד בפועל?</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm md:text-base">
        <div>
          <p className="text-accent font-bold mb-1">יום שישי</p>
          <p>מקבלים את התכנים</p>
        </div>
        <div>
          <p className="text-accent font-bold mb-1">במהלך השבוע</p>
          <p>15 דקות הכנה</p>
        </div>
        <div>
          <p className="text-accent font-bold mb-1">יום שני 21:00</p>
          <p>זום עם הרב יואב</p>
        </div>
        <div>
          <p className="text-accent font-bold mb-1">כל השבוע</p>
          <p>קבוצה ושאלות</p>
        </div>
      </div>
    </div>
  </section>
);

export default PracticalDetails;
