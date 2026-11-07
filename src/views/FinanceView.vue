<template>
  <div class="finance-view">

    <!-- ── En-tête ── -->
    <header class="view-head">
      <h1 class="view-title">
        Finance,{{ ' ' }}<br class="view-break" />
        <span class="view-title-soft">{{ headSubtitle }}</span>
      </h1>
      <button v-if="ready && hasData && !importOpen" class="btn btn--dark head-import" @click="openImport()">
        <Upload :size="16" stroke-width="2" />
        Importer le relevé
      </button>
    </header>

    <div v-if="ready && !importOpen" class="segmented tabs" role="group" aria-label="Sections Finance">
      <button
        v-for="option in tabOptions"
        :key="option.value"
        class="segmented-btn"
        :class="{ 'segmented-btn--active': tab === option.value }"
        :aria-pressed="tab === option.value"
        @click="tab = option.value"
      >{{ option.label }}</button>
    </div>

    <p v-if="error && ready" class="notice notice--error" role="alert">{{ error }}</p>

    <!-- ══ Chargement ══ -->
    <div v-if="firstLoading" class="month-grid" aria-busy="true">
      <section class="banner banner--finance">
        <span class="orb orb--a" aria-hidden="true" />
        <span class="orb orb--b" aria-hidden="true" />
        <div class="skeleton skeleton--chip" />
        <div class="skeleton skeleton--title" />
        <div class="skeleton skeleton--body" />
      </section>
      <div class="side">
        <section class="card"><div class="skeleton skeleton--body" /><div class="skeleton skeleton--value" /></section>
        <section class="card"><div class="skeleton skeleton--body" /><div class="skeleton skeleton--value" /></section>
      </div>
    </div>

    <!-- ══ Base pas encore prête ══ -->
    <section v-else-if="!ready" class="card welcome">
      <span class="welcome-icon" aria-hidden="true"><Wallet :size="22" stroke-width="1.75" /></span>
      <h2 class="card-title">Module en cours d'installation</h2>
      <p class="card-text">
        La base de données du module Finance n'est pas encore prête. Reviens un peu plus tard,
        tes budgets, ton patrimoine et tes abonnements apparaîtront ici.
      </p>
    </section>

    <!-- ══ Import ══ -->
    <template v-else-if="importOpen">
    <button class="link-btn link-btn--start back-link" @click="closeImport">
      <ChevronLeft :size="18" stroke-width="2" />
      Retour
    </button>
    <div class="import-grid">
      <div class="import-side">
        <!-- Dépôt du fichier -->
        <section
          v-if="!parsed && !importResult"
          class="card dropzone"
          :class="{ 'dropzone--over': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop.prevent="onDrop"
        >
          <span class="welcome-icon" aria-hidden="true"><FileUp :size="22" stroke-width="1.75" /></span>
          <h2 class="card-title">Relevé du compte courant</h2>
          <p class="card-text">Dépose ici l'export CSV ou OFX de la Caisse d'Épargne, ou choisis-le dans tes fichiers.</p>
          <label class="btn btn--dark file-btn" :class="{ 'file-btn--busy': parsing }">
            <input
              ref="fileInput"
              type="file"
              accept=".csv,.ofx,.qfx,.txt"
              class="file-input"
              :disabled="parsing"
              @change="onFileChange"
            />
            <Upload :size="16" stroke-width="2" />
            {{ parsing ? 'Lecture…' : 'Choisir un fichier' }}
          </label>
          <p v-if="parseError" class="notice notice--error" role="alert">{{ parseError }}</p>
        </section>

        <!-- Aperçu avant import -->
        <section v-else-if="parsed && !importResult" class="card preview">
          <h2 class="card-title">{{ fileName }}</h2>
          <ul class="facts">
            <li><span>Format</span><span>{{ parsed.format.toUpperCase() }}</span></li>
            <li><span>Opérations</span><span>{{ parsed.rows.length }}</span></li>
            <li v-if="parsed.period?.start"><span>Période</span><span>{{ longDate(parsed.period.start) }} au {{ longDate(parsed.period.end) }}</span></li>
          </ul>
          <ul v-if="parsed.warnings?.length" class="warnings">
            <li v-for="(warning, index) in parsed.warnings" :key="index">{{ warning }}</li>
          </ul>
          <div class="adjust-actions">
            <button class="btn btn--soft" :disabled="importing" @click="resetImport">Changer de fichier</button>
            <button class="btn btn--dark" :disabled="importing || !parsed.rows.length" @click="onImport">
              {{ importing ? 'Import…' : 'Importer' }}
            </button>
          </div>
        </section>

        <!-- Résumé de l'import -->
        <section v-else-if="importResult" class="card summary">
          <h2 class="card-title">
            {{ importResult.imported }} {{ importResult.imported > 1 ? 'opérations importées' : 'opération importée' }}
          </h2>
          <ul class="dots">
            <li class="dot dot--good">{{ importResult.autoClassified }} classées automatiquement</li>
            <li v-if="importResult.toReview" class="dot dot--warn">{{ importResult.toReview }} à vérifier</li>
            <li v-if="importResult.duplicates" class="dot dot--muted">{{ importResult.duplicates }} doublons ignorés</li>
            <li v-if="importResult.incomeDetectedOn" class="dot dot--finance">Revenu détecté le {{ longDate(importResult.incomeDetectedOn) }}</li>
          </ul>
        </section>
      </div>

      <!-- Opérations à vérifier -->
      <section class="card review" aria-labelledby="review-title">
        <h2 id="review-title" class="card-title">À vérifier</h2>
        <p v-if="!toReview.length" class="card-sub">Rien à vérifier, tout est classé.</p>

        <ul v-else class="review-list">
          <li v-for="tx in toReview" :key="tx.id" class="review-item">
            <div class="review-head">
              <div class="review-text">
                <p class="review-label">{{ tx.label_raw }}</p>
                <p class="card-sub">{{ longDate(tx.date) }}</p>
              </div>
              <span class="review-amount" :class="{ 'amount--in': tx.amount > 0 }">{{ signedEuro(tx.amount) }}</span>
            </div>

            <!-- Virement d'épargne -->
            <div v-if="modeOf(tx) === 'epargne'" class="chips">
              <button class="choice" :class="{ 'choice--on': sel(tx).type === 'epargne' }" @click="select(tx, { type: 'epargne' })">Épargne</button>
              <button class="choice" @click="switchToExpense(tx)">Dépense</button>
            </div>

            <!-- Remboursement ou revenu -->
            <div v-else-if="modeOf(tx) === 'rentree'" class="chips">
              <button
                v-for="expense in candidates[tx.id] || []"
                :key="expense.id"
                class="choice choice--wide"
                :class="{ 'choice--on': sel(tx).type === 'refund' && sel(tx).id === expense.id }"
                @click="select(tx, { type: 'refund', id: expense.id })"
              >Rembourse {{ expense.label || expense.label_raw }}, {{ shortDate(expense.date) }}, {{ euro(Math.abs(expense.amount)) }}</button>
              <button class="choice" :class="{ 'choice--on': sel(tx).type === 'revenu' }" @click="select(tx, { type: 'revenu' })">Revenu</button>
            </div>

            <!-- Dépense -->
            <div v-else class="chips">
              <button
                v-for="cat in proposedCategories(tx)"
                :key="cat.id"
                class="choice"
                :class="{ 'choice--on': sel(tx).type === 'cat' && sel(tx).id === cat.id }"
                @click="select(tx, { type: 'cat', id: cat.id })"
              >{{ cat.name }}</button>
              <div class="select-wrap">
                <select
                  class="choice choice--select"
                  :class="{ 'choice--on': isOtherSelected(tx) }"
                  :value="isOtherSelected(tx) ? sel(tx).id : ''"
                  aria-label="Autre catégorie"
                  @change="select(tx, { type: 'cat', id: $event.target.value })"
                >
                  <option value="" disabled>Autre…</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
            </div>

            <div class="review-foot">
              <label v-if="sel(tx).type && sel(tx).type !== 'refund'" class="remember">
                <span class="remember-text">Toujours classer « {{ ruleLabel(tx) }} » en {{ choiceName(tx) }}</span>
                <span class="switch">
                  <input v-model="remember[tx.id]" type="checkbox" />
                  <span class="switch-track"><span class="switch-thumb" /></span>
                </span>
              </label>
              <button class="btn btn--dark" :disabled="!sel(tx).type || classifying[tx.id]" @click="validate(tx)">
                {{ classifying[tx.id] ? 'Enregistrement…' : 'Valider' }}
              </button>
            </div>
          </li>
        </ul>

        <button v-if="importResult || toReview.length" class="btn btn--dark btn--wide" @click="finishImport">Terminer</button>
      </section>
    </div>
    </template>

    <!-- ══ Vue du mois ══ -->
    <template v-else-if="tab === 'mois'">
      <!-- État vide -->
      <section v-if="!hasData" class="card welcome">
        <span class="welcome-icon" aria-hidden="true"><Wallet :size="22" stroke-width="1.75" /></span>
        <h2 class="card-title">Commence par ton relevé</h2>
        <p class="card-text">
          Depuis ton espace client Caisse d'Épargne, exporte le relevé de ton compte courant
          au format CSV ou OFX, sur les 3 derniers mois. Tes dépenses seront classées et
          des budgets te seront proposés.
        </p>
        <button class="btn btn--dark" @click="openImport()">
          <Upload :size="16" stroke-width="2" />
          Importer le relevé
        </button>
      </section>

      <div v-else class="month-grid">
        <!-- Bannière du mois -->
        <section class="banner banner--finance" aria-label="Reste à vivre">
          <span class="orb orb--a" aria-hidden="true" />
          <span class="orb orb--b" aria-hidden="true" />
          <span class="chip">{{ period.label }}</span>
          <h2 class="banner-title">
            {{ euro(Math.abs(totals.remaining)) }}<br />
            <span class="banner-title-soft">{{ totals.remaining >= 0 ? 'reste à vivre' : totals.budget > 0 ? 'au-delà du budget' : 'de plus que tes revenus' }}</span>
          </h2>
          <p class="banner-meta">
            {{ euro(totals.spent) }} dépensés{{ totals.budget > 0 ? ` sur ${euro(totals.budget)}` : '' }}
          </p>
          <button class="btn btn--dark banner-import" @click="openImport()">
            <Upload :size="16" stroke-width="2" />
            Importer le relevé
          </button>
        </section>

        <div class="side">
          <div class="tiles">
            <section class="card tile">
              <p class="card-label">Épargné ce mois</p>
              <p class="tile-value">{{ euro(totals.saved) }}</p>
            </section>
            <section class="card tile">
              <p class="card-label">Abonnements</p>
              <p class="tile-value">{{ euro(subscriptionsTotal) }}</p>
              <p class="card-sub">{{ subscriptionsSummary }}</p>
            </section>
          </div>

          <button v-if="toReview.length" class="review-alert" @click="openImport()">
            <span>{{ toReview.length }} {{ toReview.length > 1 ? 'opérations' : 'opération' }} à vérifier</span>
            <ChevronRight :size="18" stroke-width="2" />
          </button>
        </div>

        <!-- Budgets -->
        <section class="card budgets" aria-labelledby="budgets-title">
          <div class="card-head">
            <h2 id="budgets-title" class="card-title">Budgets</h2>
            <button v-if="!adjusting" class="link-btn" @click="startAdjust">Ajuster</button>
            <button v-else class="link-btn" @click="adjusting = false">Annuler</button>
          </div>

          <template v-if="!adjusting">
            <ul v-if="visibleCategories.length" class="budget-list">
              <li v-for="row in visibleCategories" :key="row.category?.id ?? 'sans'" class="budget-row">
                <div class="budget-line">
                  <span class="budget-name">{{ row.category?.name ?? 'Sans catégorie' }}</span>
                  <span class="budget-amounts">
                    <span :class="{ 'amount--over': row.state === 'rate' }">{{ euro(row.spent) }}</span>
                    <template v-if="row.budget"> / {{ euro(row.budget) }}</template>
                  </span>
                </div>
                <div
                  v-if="row.budget"
                  class="gauge"
                  role="progressbar"
                  :aria-valuenow="Math.round((row.ratio || 0) * 100)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-label="`Budget ${row.category?.name ?? ''}`"
                >
                  <span class="gauge-fill" :class="`gauge-fill--${row.state}`" :style="{ width: gaugeWidth(row.ratio) }" />
                </div>
              </li>
            </ul>
            <p v-else class="card-sub">Aucune dépense classée sur cette période.</p>
          </template>

          <!-- Mode ajustement -->
          <template v-else>
            <ul class="adjust-list">
              <li v-for="cat in adjustCategories" :key="cat.id" class="adjust-row">
                <input
                  v-model="drafts[cat.id].name"
                  class="field-input"
                  type="text"
                  :aria-label="`Nom de la catégorie ${cat.name}`"
                />
                <div class="euro-field">
                  <input
                    v-model="drafts[cat.id].budget"
                    class="field-input field-input--amount"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="10"
                    placeholder="Aucun"
                    :aria-label="`Budget ${cat.name}`"
                  />
                  <span class="euro-suffix" aria-hidden="true">€</span>
                </div>
                <button class="icon-btn" :aria-label="`Archiver ${cat.name}`" @click="onArchiveCategory(cat)">
                  <Archive :size="18" stroke-width="1.75" />
                </button>
              </li>
            </ul>

            <form class="add-row" @submit.prevent="onAddCategory">
              <input v-model="newCategoryName" class="field-input" type="text" placeholder="Nouvelle catégorie" aria-label="Nouvelle catégorie" />
              <button class="btn btn--soft" type="submit" :disabled="!newCategoryName.trim() || busy">
                <Plus :size="16" stroke-width="2" />
                Ajouter
              </button>
            </form>

            <div class="adjust-actions">
              <button class="btn btn--soft" :disabled="busy" @click="onSuggest">Proposer d'après 3 mois</button>
              <button class="btn btn--dark" :disabled="busy" @click="onSaveBudgets">Enregistrer</button>
            </div>
          </template>
        </section>

        <!-- Dépenses sur 6 mois -->
        <section class="card history" aria-labelledby="history-title">
          <div class="card-head card-head--baseline">
            <h2 id="history-title" class="card-title">Dépenses sur 6 mois</h2>
            <span v-if="history.average != null" class="card-sub">moyenne {{ euro0(history.average) }}</span>
          </div>

          <template v-if="history.months.length >= 2">
            <div class="bars">
              <div
                v-for="month in history.months"
                :key="month.key"
                class="bar-col"
                :class="{ 'bar-col--current': month.current }"
              >
                <div class="bar-track">
                  <div
                    class="bar"
                    role="img"
                    :aria-label="`${month.name}, ${euro0(month.total)}`"
                    :style="{ height: barHeight(month) }"
                  >
                    <span
                      v-for="segment in segmentsOf(month)"
                      :key="segment.id"
                      class="bar-seg"
                      :style="{ flexGrow: segment.amount, background: segment.color }"
                    />
                  </div>
                </div>
                <span class="bar-label">{{ month.label }}</span>
              </div>
            </div>

            <ul class="legend">
              <li v-for="serie in history.series" :key="serie.id" class="legend-item">
                <span class="legend-dot" :style="{ background: `var(${serie.colorToken})` }" aria-hidden="true" />
                {{ serie.name }}
              </li>
            </ul>

            <p v-if="currentHistoryMonth" class="card-sub">{{ capitalize(currentHistoryMonth.name) }} en cours, barre pâle jusqu'à la fin de la période.</p>

            <div v-if="spendingComparison.length && previousHistoryMonth" class="compare">
              <p class="card-label">Face à {{ previousHistoryMonth.name }}, à date égale</p>
              <ul class="compare-list">
                <li v-for="row in spendingComparison" :key="row.category.id" class="compare-row">
                  <span>{{ row.category.name }}</span>
                  <span class="compare-delta" :class="row.delta > 0 ? 'compare-delta--up' : 'compare-delta--down'">{{ signedEuro0(row.delta) }}</span>
                </li>
              </ul>
            </div>
          </template>
          <p v-else class="card-sub">L'historique apparaîtra après deux mois de relevés.</p>
        </section>

        <!-- Patrimoine -->
        <section class="card wealth" aria-labelledby="wealth-title">
          <div class="card-head">
            <h2 id="wealth-title" class="card-title">Patrimoine</h2>
            <button class="link-btn" @click="tab = 'patrimoine'">Mettre à jour</button>
          </div>
          <template v-if="patrimoine.byAccount.length">
            <div class="wealth-total">
              <p class="tile-value">{{ euro(patrimoine.total) }}</p>
              <span v-if="patrimoine.deltaPct != null" class="pill" :class="{ 'pill--down': patrimoine.deltaPct < 0 }">
                {{ pct(patrimoine.deltaPct) }} ce mois
              </span>
            </div>
            <ul class="account-list">
              <li v-for="item in patrimoine.byAccount" :key="item.account.id" class="account-row">
                <span>{{ item.account.name }}</span>
                <span class="account-value">{{ euro(item.value) }}</span>
              </li>
            </ul>
            <p v-if="patrimoine.lastUpdate" class="card-sub">Valeurs saisies le {{ longDate(patrimoine.lastUpdate) }}</p>
          </template>
          <p v-else class="card-sub">Ajoute ton PEA et tes livrets pour suivre leur valeur chaque mois.</p>
        </section>
      </div>
    </template>

    <!-- ══ Abonnements ══ -->
    <div v-else-if="tab === 'abonnements'" class="subs-grid">
      <!-- Calendrier des prélèvements -->
      <section class="card calendar" aria-labelledby="cal-title">
        <div class="cal-head">
          <button class="icon-btn icon-btn--plain" aria-label="Mois précédent" @click="moveCalendar(-1)">
            <ChevronLeft :size="20" stroke-width="2" />
          </button>
          <h2 id="cal-title" class="card-title cal-title" aria-live="polite">{{ calendarTitle }}</h2>
          <button class="icon-btn icon-btn--plain" aria-label="Mois suivant" @click="moveCalendar(1)">
            <ChevronRight :size="20" stroke-width="2" />
          </button>
        </div>

        <div class="cal-grid">
          <span v-for="(letter, index) in weekLetters" :key="`l${index}`" class="cal-weekday" aria-hidden="true">{{ letter }}</span>
          <template v-for="cell in calendarCells" :key="cell.key">
            <span v-if="cell.empty" class="cal-cell cal-cell--empty" aria-hidden="true" />
            <button
              v-else-if="cell.subs.length"
              class="cal-cell cal-cell--subs"
              :class="{ 'cal-cell--past': cell.past, 'cal-cell--today': cell.today }"
              :aria-label="`${longDate(cell.iso)} : ${cell.subs.map((sub) => sub.name).join(', ')}`"
              @click="onDayClick(cell)"
            >
              <span class="cal-num">{{ cell.day }}</span>
              <span class="cal-logos">
                <ServiceLogo
                  v-for="sub in cell.subs.slice(0, cell.subs.length > 2 ? 1 : 2)"
                  :key="sub.id"
                  :name="sub.name"
                  :pattern="sub.pattern"
                  :size="calendarLogoSize"
                />
                <span v-if="cell.subs.length > 2" class="cal-more">+{{ cell.subs.length - 1 }}</span>
              </span>
            </button>
            <span
              v-else
              class="cal-cell"
              :class="{ 'cal-cell--past': cell.past, 'cal-cell--today': cell.today }"
            >
              <span class="cal-num">{{ cell.day }}</span>
            </span>
          </template>
        </div>
      </section>

      <div class="subs-side">
        <!-- Prochains prélèvements -->
        <section class="card upcoming" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" class="card-title">Prochains prélèvements</h2>
          <template v-if="upcoming.length">
            <p class="upcoming-total"><strong>{{ euro(upcomingTotal) }}</strong> {{ payLabel }}</p>
            <ul class="sub-list">
              <li
                v-for="item in upcoming"
                :id="`sub-${item.sub.id}`"
                :key="item.sub.id"
                class="sub-row"
                :class="{ 'sub-row--focus': highlighted.includes(item.sub.id) }"
              >
                <ServiceLogo :name="item.sub.name" :pattern="item.sub.pattern" :size="36" />
                <div class="sub-text">
                  <p class="sub-name">{{ item.sub.name }}</p>
                  <p class="card-sub">{{ item.next ? `${longDate(item.next)}, ${relativeDay(item.next)}` : 'Prélèvement mensuel' }}</p>
                </div>
                <div class="sub-amount">
                  <p>{{ euro(item.sub.amount) }}</p>
                  <p v-if="item.sub.increased" class="sub-up">hausse de {{ euro(increaseOf(item.sub)) }}</p>
                </div>
              </li>
            </ul>
            <div class="debited">
              <span>Déjà prélevés ce mois</span>
              <span class="debited-value">{{ euro(debitedTotal) }}</span>
            </div>
          </template>
          <p v-else class="card-sub">
            {{ subscriptionsNew.length ? 'Confirme les abonnements détectés pour les voir ici.' : "Aucun abonnement détecté pour l'instant. Ils apparaissent après deux mois de prélèvements." }}
          </p>
        </section>

        <!-- Abonnements détectés -->
        <div v-for="sub in subscriptionsNew" :key="sub.id" class="sub-new">
          <div class="sub-new-main">
            <ServiceLogo :name="sub.name" :pattern="sub.pattern" :size="36" />
            <div class="sub-new-text">
              <p class="sub-name">Nouveau : {{ sub.name }}</p>
              <p class="card-sub">{{ euro(sub.amount) }}{{ sub.day ? `, prélevé le ${sub.day} du mois` : '' }}</p>
            </div>
          </div>
          <div class="sub-new-actions">
            <button class="btn btn--light" :disabled="busy" @click="onIgnoreSub(sub)">Ignorer</button>
            <button class="btn btn--dark" :disabled="busy" @click="onConfirmSub(sub)">Confirmer</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Patrimoine ══ -->
    <div v-else class="wealth-grid">
      <section class="card chart-card" aria-labelledby="chart-title">
        <p class="card-label" id="chart-title">Patrimoine, 6 derniers mois</p>
        <p class="tile-value">{{ euro(patrimoine.total) }}</p>
        <template v-if="chartPath">
          <svg class="chart" viewBox="0 0 300 120" preserveAspectRatio="none" role="img" :aria-label="`Évolution du patrimoine sur ${patrimoine.history.length} mois`">
            <path :d="`${chartPath} L 300 120 L 0 120 Z`" class="chart-area" />
            <path :d="chartPath" class="chart-line" vector-effect="non-scaling-stroke" />
          </svg>
          <div class="chart-months" aria-hidden="true">
            <span v-for="point in patrimoine.history" :key="point.month">{{ monthShort(point.month) }}</span>
          </div>
        </template>
        <p v-else class="card-sub">La courbe apparaîtra après deux mois de valeurs saisies.</p>
      </section>

      <section class="card gains" aria-labelledby="gains-title">
        <h2 id="gains-title" class="card-title">Investi et plus-value</h2>
        <ul v-if="gainRows.length" class="gain-list">
          <li v-for="item in gainRows" :key="item.account.id" class="gain-row">
            <div class="gain-line">
              <div class="gain-text">
                <p class="sub-name">{{ item.account.name }}</p>
                <p v-if="item.invested != null" class="card-sub">{{ euro(item.invested) }} versés</p>
              </div>
              <span class="account-value">{{ euro(item.value) }}</span>
            </div>
            <p v-if="item.gain != null" class="gain-figures" :class="item.gain >= 0 ? 'gain--up' : 'gain--down'">
              <span>{{ signedEuro0(item.gain) }}</span>
              <span v-if="item.account.kind === 'livret'">intérêts</span>
              <span v-else-if="item.gainPct != null">{{ signedPct(item.gainPct) }}</span>
            </p>
          </li>
        </ul>
        <p v-else class="card-sub">Saisis la valeur de tes placements et le montant versé pour suivre ta plus-value.</p>
      </section>

      <section class="card values" aria-labelledby="values-title">
        <h2 id="values-title" class="card-title">Valeurs de {{ currentMonthName }}</h2>
        <div v-if="holdingAccounts.length" class="values-table">
          <div class="values-head" aria-hidden="true">
            <span class="values-head-spacer" />
            <span>Valeur</span>
            <span>Versé</span>
          </div>
          <div v-for="account in holdingAccounts" :key="account.id" class="values-row">
            <div class="values-name">
              <p class="sub-name">{{ account.name }}</p>
              <p class="card-sub">{{ previousValueText(account.id) }}</p>
            </div>
            <div class="euro-field">
              <input
                v-model="valueDrafts[account.id]"
                class="field-input field-input--amount"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
                :aria-label="`Valeur ${account.name}`"
              />
              <span class="euro-suffix" aria-hidden="true">€</span>
            </div>
            <div class="euro-field">
              <input
                v-model="investedDrafts[account.id]"
                class="field-input field-input--amount"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
                :aria-label="`Montant versé ${account.name}`"
              />
              <span class="euro-suffix" aria-hidden="true">€</span>
            </div>
          </div>
        </div>
        <p v-else class="card-sub">Aucun placement pour l'instant.</p>

        <form v-if="addingAccount" class="add-account" @submit.prevent="onAddAccount">
          <input v-model="newAccount.name" class="field-input" type="text" placeholder="Nom, par exemple PEA" aria-label="Nom du placement" />
          <div class="segmented segmented--small" role="group" aria-label="Type de placement">
            <button
              v-for="option in accountKinds"
              :key="option.value"
              type="button"
              class="segmented-btn"
              :class="{ 'segmented-btn--active': newAccount.kind === option.value }"
              :aria-pressed="newAccount.kind === option.value"
              @click="newAccount.kind = option.value"
            >{{ option.label }}</button>
          </div>
          <div class="adjust-actions">
            <button type="button" class="btn btn--soft" @click="addingAccount = false">Annuler</button>
            <button type="submit" class="btn btn--dark" :disabled="!newAccount.name.trim() || busy">Ajouter</button>
          </div>
        </form>
        <button v-else class="link-btn link-btn--start" @click="addingAccount = true">
          <Plus :size="16" stroke-width="2" />
          Ajouter un placement
        </button>

        <button v-if="holdingAccounts.length" class="btn btn--dark btn--wide" :disabled="busy" @click="onSaveValues">
          Enregistrer les valeurs
        </button>
      </section>

      <p class="disclaimer">Suivi chiffré seulement, sans conseil d'investissement.</p>
    </div>

    <p v-if="notice" class="notice notice--toast" :class="`notice--${notice.type}`" :role="notice.type === 'error' ? 'alert' : 'status'">{{ notice.text }}</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useFinance } from '@/composables/useFinance'
import { useConfirm } from '@/composables/useConfirm'
import { smoothPath } from '@/composables/useChartPath'
import { addDays, diffDays, toDay } from '@/utils/finance/period'
import ServiceLogo from '@/components/finance/ServiceLogo.vue'
import { Upload, FileUp, ChevronLeft, ChevronRight, Plus, Archive, Wallet } from 'lucide-vue-next'

const {
  loading, error, ready, hasData,
  accounts, categories, holdingValues,
  period, totals, byCategory, toReview,
  subscriptionsActive, subscriptionsNew, subscriptionsTotal,
  patrimoine, spendingHistory, spendingComparison,
  load, parseFile, importRows, classify, linkRefund, candidateExpensesFor,
  suggestBudgets, applyBudgets,
  addCategory, renameCategory, archiveCategory,
  confirmSubscription, ignoreSubscription,
  addAccount, saveHoldingValues
} = useFinance()
const { askConfirm } = useConfirm()

const tabOptions = [
  { value: 'mois', label: 'Mois' },
  { value: 'abonnements', label: 'Abonnements' },
  { value: 'patrimoine', label: 'Patrimoine' }
]
const tab = ref('mois')

// ── Formats ──
const NBSP = ' '
const euro = (value) => `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}${NBSP}€`
const signedEuro = (value) => (value > 0 ? `+${euro(value)}` : euro(value))
const MINUS = '\u2212'
const euro0 = (value) => `${Math.round(Number(value) || 0).toLocaleString('fr-FR')}${NBSP}€`
const signedEuro0 = (value) => `${value > 0 ? '+' : value < 0 ? MINUS : ''}${euro0(Math.abs(value))}`
const signedPct = (value) => `${value > 0 ? '+' : value < 0 ? MINUS : ''}${Math.abs(value).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${NBSP}%`
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : '')
const pct = (value) => `${value >= 0 ? '+' : ''}${Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${NBSP}%`

// Date locale sans décalage de fuseau
const toDate = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const longDate = (iso) => (iso ? toDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '')
const shortDate = (iso) => (iso ? toDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '')
const monthShort = (iso) => toDate(iso).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')

// Évite d'afficher l'état non prêt avant la première lecture
const loadedOnce = ref(false)
const firstLoading = computed(() =>
  (!loadedOnce.value && !hasData.value) || (loading.value && !hasData.value && !accounts.value.length)
)

const headSubtitle = computed(() => {
  if (!ready.value || !period.value) return 'budget et patrimoine'
  const days = period.value.daysLeft
  if (days <= 0) return 'dernier jour'
  return `encore ${days} ${days > 1 ? 'jours' : 'jour'}`
})

const subscriptionsSummary = computed(() => {
  const count = subscriptionsActive.value.length
  const pending = subscriptionsNew.value.length
  // Tant que rien n'est confirmé, on invite à confirmer plutôt que d'afficher 0
  if (!count && pending) return `${pending} à confirmer`
  const up = subscriptionsActive.value.filter((s) => s.increased).length
  let text = `${count} ${count > 1 ? 'actifs' : 'actif'}`
  if (up) text += `, ${up} ${up > 1 ? 'hausses' : 'hausse'}`
  return text
})

// Hors ajustement, on ne montre que les catégories qui ont un budget ou des dépenses
const visibleCategories = computed(() => byCategory.value.filter((row) => row.budget > 0 || row.spent > 0))

const gaugeWidth = (ratio) => `${Math.min(100, Math.max(0, (ratio || 0) * 100))}%`

// ── Messages ──
const notice = ref(null)
let noticeTimer = null
const showNotice = (text, type = 'good') => {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = null }, 4000)
}

// Les actions renvoient un résultat ; une erreur éventuelle passe par error ou result.error
const busy = ref(false)
const run = async (action, successText) => {
  busy.value = true
  try {
    const result = await action()
    if (result?.error) {
      showNotice(typeof result.error === 'string' ? result.error : "L'enregistrement a échoué.", 'error')
      return null
    }
    if (successText) showNotice(successText)
    return result ?? true
  } catch (e) {
    showNotice(e?.message || "L'enregistrement a échoué.", 'error')
    return null
  } finally {
    busy.value = false
  }
}

// ── Budgets ──
const adjusting = ref(false)
const drafts = reactive({})
const newCategoryName = ref('')

const syncDrafts = () => {
  for (const cat of categories.value) {
    if (!drafts[cat.id]) drafts[cat.id] = { name: cat.name, budget: cat.budget ?? '' }
  }
}

const startAdjust = () => {
  for (const key of Object.keys(drafts)) delete drafts[key]
  syncDrafts()
  adjusting.value = true
}

const adjustCategories = computed(() => categories.value.filter((cat) => drafts[cat.id]))

// Une catégorie ajoutée pendant l'ajustement reçoit sa ligne
watch(categories, () => { if (adjusting.value) syncDrafts() })

const onSuggest = async () => {
  const list = await run(() => suggestBudgets())
  if (!Array.isArray(list)) return
  for (const item of list) {
    if (drafts[item.categoryId]) drafts[item.categoryId].budget = item.amount
  }
  showNotice(list.length ? 'Budgets proposés, ajuste-les si besoin.' : 'Pas assez de mois complets pour proposer des budgets.')
}

const onSaveBudgets = async () => {
  const renames = categories.value.filter((cat) => {
    const name = drafts[cat.id]?.name?.trim()
    return name && name !== cat.name
  })
  for (const cat of renames) {
    const ok = await run(() => renameCategory(cat.id, drafts[cat.id].name.trim()))
    if (!ok) return
  }
  const list = categories.value.map((cat) => {
    const raw = drafts[cat.id]?.budget
    return { categoryId: cat.id, amount: raw === '' || raw == null ? null : Number(raw) }
  })
  const ok = await run(() => applyBudgets(list), 'Budgets enregistrés.')
  if (ok) adjusting.value = false
}

const onAddCategory = async () => {
  const name = newCategoryName.value.trim()
  if (!name) return
  const ok = await run(() => addCategory(name))
  if (ok) newCategoryName.value = ''
}

const onArchiveCategory = async (cat) => {
  const accepted = await askConfirm({
    title: `Archiver la catégorie « ${cat.name} » ?`,
    detail: 'Elle disparaît des budgets. Les opérations déjà classées gardent leur historique.',
    confirmLabel: 'Archiver'
  })
  if (!accepted) return
  const ok = await run(() => archiveCategory(cat.id), 'Catégorie archivée.')
  if (ok) delete drafts[cat.id]
}

// ── Import ──
const fileInput = ref(null)
const dragOver = ref(false)
const parsing = ref(false)
const parseError = ref('')
const parsed = ref(null)
const fileName = ref('')
const importing = ref(false)
const importResult = ref(null)

const importOpen = ref(false)
const openImport = () => { importOpen.value = true }

// Retour sans import en cours : on repart d'un dépôt vierge la prochaine fois
const closeImport = () => {
  if (importResult.value) resetImport()
  importOpen.value = false
}

const handleFile = async (file) => {
  if (!file) return
  parseError.value = ''
  parsed.value = null
  importResult.value = null
  parsing.value = true
  try {
    parsed.value = await parseFile(file)
    fileName.value = file.name
  } catch (e) {
    parseError.value = e?.message || 'Ce fichier est illisible.'
  } finally {
    parsing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const onFileChange = (event) => handleFile(event.target.files?.[0])
const onDrop = (event) => {
  dragOver.value = false
  handleFile(event.dataTransfer?.files?.[0])
}

const resetImport = () => {
  parsed.value = null
  importResult.value = null
  parseError.value = ''
  fileName.value = ''
}

const onImport = async () => {
  if (!parsed.value) return
  importing.value = true
  try {
    const result = await importRows(parsed.value, { fileName: fileName.value })
    if (!result || result.error) {
      showNotice(typeof result?.error === 'string' ? result.error : (error.value || "L'import a échoué."), 'error')
      // Import partiel : on montre tout de même le résumé
      if (!result?.imported) return
    }
    importResult.value = result
    parsed.value = null
  } catch (e) {
    showNotice(e?.message || "L'import a échoué.", 'error')
  } finally {
    importing.value = false
  }
}

const finishImport = () => {
  resetImport()
  importOpen.value = false
  tab.value = 'mois'
}

// ── Opérations à vérifier ──
const selections = reactive({})
const remember = reactive({})
const classifying = reactive({})
const expenseOverride = reactive({})
const candidates = reactive({})

const catName = (id) => categories.value.find((c) => c.id === id)?.name ?? 'Autre'

const modeOf = (tx) => {
  if (tx.kind === 'epargne' && !expenseOverride[tx.id]) return 'epargne'
  if (tx.amount > 0 && !expenseOverride[tx.id]) return 'rentree'
  return 'depense'
}

// Sélection par défaut : la proposition la plus probable
const defaultSelection = (tx) => {
  const mode = modeOf(tx)
  if (mode === 'epargne') return { type: 'epargne' }
  if (mode === 'rentree') return tx.kind === 'revenu' ? { type: 'revenu' } : {}
  return tx.category_id ? { type: 'cat', id: tx.category_id } : {}
}

const sel = (tx) => selections[tx.id] ?? defaultSelection(tx)
const select = (tx, choice) => { selections[tx.id] = choice }

const switchToExpense = (tx) => {
  expenseOverride[tx.id] = true
  selections[tx.id] = tx.category_id ? { type: 'cat', id: tx.category_id } : {}
}

// Catégorie probable en premier, puis les deux catégories les plus utilisées
const topCategoryIds = computed(() => {
  const ids = byCategory.value.map((row) => row.category?.id).filter(Boolean)
  for (const cat of categories.value) if (!ids.includes(cat.id)) ids.push(cat.id)
  return ids
})

const proposedCategories = (tx) => {
  const ids = []
  if (tx.category_id && categories.value.some((c) => c.id === tx.category_id)) ids.push(tx.category_id)
  for (const id of topCategoryIds.value) {
    if (ids.length >= 3) break
    if (!ids.includes(id)) ids.push(id)
  }
  return ids.map((id) => categories.value.find((c) => c.id === id)).filter(Boolean)
}

const isOtherSelected = (tx) => {
  const current = sel(tx)
  return current.type === 'cat' && !proposedCategories(tx).some((c) => c.id === current.id)
}

const ruleLabel = (tx) => String(tx.label || tx.label_raw || '').toUpperCase()

const choiceName = (tx) => {
  const current = sel(tx)
  if (current.type === 'revenu') return 'Revenu'
  if (current.type === 'epargne') return 'Épargne'
  if (current.type === 'cat') return catName(current.id)
  return ''
}

const validate = async (tx) => {
  const current = sel(tx)
  if (!current.type) return
  classifying[tx.id] = true
  try {
    let result
    if (current.type === 'refund') {
      result = await linkRefund(tx.id, current.id)
    } else {
      const kind = current.type === 'cat' ? 'depense' : current.type
      const categoryId = current.type === 'cat' ? current.id : null
      result = await classify(tx.id, { categoryId, kind, remember: !!remember[tx.id] })
    }
    if (result?.error) {
      showNotice(typeof result.error === 'string' ? result.error : "Le classement n'a pas été enregistré.", 'error')
      return
    }
    delete selections[tx.id]
    delete remember[tx.id]
    delete expenseOverride[tx.id]
  } catch (e) {
    showNotice(e?.message || "Le classement n'a pas été enregistré.", 'error')
  } finally {
    delete classifying[tx.id]
  }
}

// Dépenses candidates pour chaque rentrée à vérifier
watch(toReview, async (list) => {
  for (const tx of list) {
    if (tx.amount > 0 && tx.kind !== 'epargne' && !(tx.id in candidates)) {
      candidates[tx.id] = []
      try {
        candidates[tx.id] = (await candidateExpensesFor(tx)) || []
      } catch {
        candidates[tx.id] = []
      }
    }
  }
}, { immediate: true })

// ── Patrimoine ──
const accountKinds = [
  { value: 'pea', label: 'PEA' },
  { value: 'livret', label: 'Livret' },
  { value: 'autre', label: 'Autre' }
]

const pad = (n) => String(n).padStart(2, '0')
const today = new Date()
const todayIso = toDay(today)
const currentMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
const currentMonthName = today.toLocaleDateString('fr-FR', { month: 'long' })

const holdingAccounts = computed(() => accounts.value.filter((a) => a.kind !== 'courant'))

const valueDrafts = reactive({})
const valueFor = (accountId, month) =>
  holdingValues.value.find((v) => v.account_id === accountId && String(v.month).slice(0, 10) === month)

// Pré-remplit avec la valeur du mois courant si elle existe déjà
watch([holdingAccounts, holdingValues], () => {
  for (const account of holdingAccounts.value) {
    if (valueDrafts[account.id] === undefined) {
      const existing = valueFor(account.id, currentMonth)
      valueDrafts[account.id] = existing ? existing.value : ''
    }
  }
}, { immediate: true })

const investedDrafts = reactive({})
const lastInvested = (accountId) => {
  const known = holdingValues.value
    .filter((v) => v.account_id === accountId && v.invested != null && String(v.month).slice(0, 10) <= currentMonth)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))[0]
  return known ? known.invested : ''
}

watch([holdingAccounts, holdingValues], () => {
  for (const account of holdingAccounts.value) {
    if (investedDrafts[account.id] === undefined) investedDrafts[account.id] = lastInvested(account.id)
  }
}, { immediate: true })

const previousValueText = (accountId) => {
  const previous = holdingValues.value
    .filter((v) => v.account_id === accountId && String(v.month).slice(0, 10) < currentMonth)
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))[0]
  if (!previous) return 'Première valeur'
  return `${euro(previous.value)} en ${toDate(previous.month).toLocaleDateString('fr-FR', { month: 'short' })}`
}

const gainRows = computed(() => patrimoine.value.byAccount.filter((item) => item.value != null))

const onSaveValues = async () => {
  const list = holdingAccounts.value
    .filter((a) => valueDrafts[a.id] !== '' && valueDrafts[a.id] != null)
    .map((a) => {
      const invested = investedDrafts[a.id]
      return {
        accountId: a.id,
        value: Number(valueDrafts[a.id]),
        invested: invested === '' || invested == null ? null : Number(invested)
      }
    })
  if (!list.length) {
    showNotice('Saisis au moins une valeur.', 'error')
    return
  }
  const result = await run(() => saveHoldingValues(currentMonth, list))
  if (result) showNotice(result.warning || 'Valeurs enregistrées.', result.warning ? 'warn' : 'good')
}

const addingAccount = ref(false)
const newAccount = reactive({ name: '', kind: 'pea' })

const onAddAccount = async () => {
  const name = newAccount.name.trim()
  if (!name) return
  const ok = await run(() => addAccount({ name, kind: newAccount.kind }), 'Placement ajouté.')
  if (ok) {
    newAccount.name = ''
    newAccount.kind = 'pea'
    addingAccount.value = false
  }
}

const chartPath = computed(() => {
  const values = (patrimoine.value?.history || []).map((point) => Number(point.total) || 0)
  if (values.length < 2 || values.every((v) => v === 0)) return ''
  return smoothPath(values, { width: 300, height: 120, pad: 8 })
})

// ── Abonnements ──
const increaseOf = (sub) => Math.max(0, Number(sub.amount || 0) - Number(sub.previous_amount || 0))

const onConfirmSub = (sub) => run(() => confirmSubscription(sub.id), 'Abonnement confirmé.')
const onIgnoreSub = (sub) => run(() => ignoreSubscription(sub.id))

// ── Dépenses sur 6 mois ──
const history = computed(() => spendingHistory.value)
const historyMax = computed(() => Math.max(0, ...history.value.months.map((m) => m.total)))
const barHeight = (month) => (historyMax.value > 0 ? `${(month.total / historyMax.value) * 100}%` : '0%')
const segmentsOf = (month) =>
  history.value.series
    .filter((serie) => month.byCategory[serie.id] > 0)
    .map((serie) => ({ id: serie.id, amount: month.byCategory[serie.id], color: `var(${serie.colorToken})` }))
const currentHistoryMonth = computed(() => history.value.months.find((m) => m.current) ?? null)
const previousHistoryMonth = computed(() => {
  const months = history.value.months
  return months.length >= 2 && months.at(-1).current ? months.at(-2) : null
})

// ── Calendrier des abonnements ──
const weekLetters = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const calendar = ref({ y: today.getFullYear(), m: today.getMonth() })

const moveCalendar = (step) => {
  const d = new Date(calendar.value.y, calendar.value.m + step, 1)
  calendar.value = { y: d.getFullYear(), m: d.getMonth() }
}

const calendarTitle = computed(() =>
  capitalize(new Date(calendar.value.y, calendar.value.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
)

const daysIn = (y, m) => new Date(y, m + 1, 0).getDate()
// Jour du prélèvement dans un mois donné : le dernier jour si le mois est plus court
const debitDay = (sub, y, m) => Math.min(Number(sub.day), daysIn(y, m))
const datedSubs = computed(() => subscriptionsActive.value.filter((sub) => Number(sub.day) > 0))

const calendarCells = computed(() => {
  const { y, m } = calendar.value
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < offset; i++) cells.push({ key: `vide-${i}`, empty: true })
  for (let day = 1; day <= daysIn(y, m); day++) {
    const iso = toDay(new Date(y, m, day))
    cells.push({
      key: iso,
      iso,
      day,
      past: iso < todayIso,
      today: iso === todayIso,
      subs: datedSubs.value.filter((sub) => debitDay(sub, y, m) === day)
    })
  }
  return cells
})

// Logos plus grands sur desktop, où les cases sont plus hautes
const wide = ref(false)
let wideQuery = null
const syncWide = () => { wide.value = !!wideQuery?.matches }
const calendarLogoSize = computed(() => (wide.value ? 28 : 20))

// Mise en avant des abonnements d'un jour dans la liste
const highlighted = ref([])
let highlightTimer = null
const onDayClick = async (cell) => {
  highlighted.value = cell.subs.map((sub) => sub.id)
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => { highlighted.value = [] }, 2400)
  await nextTick()
  const target = document.getElementById(`sub-${cell.subs[0]?.id}`)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
}

// Prochaine date de prélèvement, aujourd'hui compris
const nextDateOf = (sub) => {
  if (!(Number(sub.day) > 0)) return null
  const y = today.getFullYear()
  const m = today.getMonth()
  const thisMonth = toDay(new Date(y, m, debitDay(sub, y, m)))
  if (thisMonth >= todayIso) return thisMonth
  const next = new Date(y, m + 1, 1)
  return toDay(new Date(next.getFullYear(), next.getMonth(), debitDay(sub, next.getFullYear(), next.getMonth())))
}

const upcoming = computed(() =>
  subscriptionsActive.value
    .map((sub) => ({ sub, next: nextDateOf(sub) }))
    .sort((a, b) => {
      if (!a.next || !b.next) return a.next ? -1 : b.next ? 1 : 0
      return a.next < b.next ? -1 : a.next > b.next ? 1 : 0
    })
)

const round2 = (n) => Math.round(n * 100) / 100

// Somme des prélèvements entre demain et la fin de la période
const upcomingTotal = computed(() =>
  round2(upcoming.value
    .filter((item) => item.next && item.next > todayIso && item.next <= period.value.end)
    .reduce((sum, item) => sum + Number(item.sub.amount || 0), 0))
)

const debitedTotal = computed(() =>
  round2(datedSubs.value
    .filter((sub) => debitDay(sub, today.getFullYear(), today.getMonth()) < today.getDate())
    .reduce((sum, sub) => sum + Number(sub.amount || 0), 0))
)

const payLabel = computed(() =>
  period.value.basedOnIncome ? `d'ici ta paie du ${longDate(addDays(period.value.end, 1))}` : "d'ici la fin du mois"
)

const relativeDay = (iso) => {
  const days = diffDays(todayIso, iso)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  return `dans ${days} jours`
}

onBeforeUnmount(() => {
  clearTimeout(highlightTimer)
  wideQuery?.removeEventListener?.('change', syncWide)
})

onMounted(async () => {
  wideQuery = window.matchMedia?.('(min-width: 1100px)') ?? null
  syncWide()
  wideQuery?.addEventListener?.('change', syncWide)
  try {
    await load()
  } finally {
    loadedOnce.value = true
  }
})
</script>

<style scoped>
/* ── En-tête ── */
.view-head {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.view-title {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
}

.view-title-soft { color: var(--text-secondary); }

.view-head .head-import { display: none; }

/* ── Boutons ── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.btn:hover { opacity: 0.88; }
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--dark  { background: var(--action); color: var(--on-action); }
.btn--soft  { background: var(--bg-overlay); color: var(--text-primary); }
.btn--light { background: var(--bg-raised); color: var(--text-primary); }
.btn--wide  { width: 100%; }

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 44px;
  padding: 0 var(--space-1);
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--module-finance);
  cursor: pointer;
}

.link-btn--start { align-self: flex-start; }
.back-link { margin-left: calc(-1 * var(--space-1)); }

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-btn--plain { background: none; color: var(--text-primary); }

/* ── Messages ── */
.notice {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
}

.notice--toast {
  position: fixed;
  left: 50%;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  z-index: calc(var(--z-modal) + 1);
  width: max-content;
  max-width: calc(100% - 32px);
  transform: translateX(-50%);
  box-shadow: var(--shadow-lg);
}

.notice--good  { background: var(--status-success-dim); color: var(--status-success); }
.notice--error { background: var(--status-error-dim);   color: var(--status-error); }
.notice--warn  { background: var(--status-warning-dim); color: var(--status-warning); }

/* ── Sélecteur ── */
.segmented {
  display: flex;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
}

.segmented--small { background: var(--bg-overlay); }

.segmented-btn {
  flex: 1;
  min-height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  cursor: pointer;
}

.segmented-btn--active {
  background: var(--action);
  color: var(--on-action);
}

/* ── Bandeau ── */
.banner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: var(--space-2);
  min-height: 180px;
  padding: 18px;
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.banner > :not(.orb) {
  position: relative;
  z-index: var(--z-raised);
}

.banner--finance { background: var(--aurore-finance); }

.banner-title {
  max-width: 72%;
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.22;
  font-variant-numeric: tabular-nums;
}

.banner-title-soft { color: var(--text-secondary); }

.banner-meta {
  max-width: 72%;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.banner-import { margin-top: var(--space-2); }

.chip {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--module-finance);
}

.orb {
  position: absolute;
  border-radius: 50%;
  opacity: var(--orb-opacity);
  pointer-events: none;
}

.orb--a { top: -40px; right: -30px; width: 130px; height: 130px; background: var(--orb-menthe); }
.orb--b { top: 70px; right: -24px; width: 64px; height: 64px; background: var(--orb-peche); }

/* ── Cartes ── */
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.card-head--baseline { align-items: baseline; flex-wrap: wrap; }

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card-label,
.card-sub {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.card-text {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--text-secondary);
}

.welcome {
  align-items: flex-start;
  gap: var(--space-3);
  max-width: 640px;
}

.welcome-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--module-finance-dim);
  color: var(--module-finance);
}

.tile-value {
  font-size: var(--text-xl);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.amount--over { color: var(--status-error); }
.amount--in { color: var(--status-success); }

/* ── Vue du mois ── */
.finance-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 1480px;
  margin: 0 auto;
}

.month-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "banner"
    "side"
    "budgets"
    "history"
    "wealth";
  gap: var(--space-3);
}

.month-grid > .banner { grid-area: banner; }
.side {
  grid-area: side;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.tile { gap: var(--space-1); }

.review-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 52px;
  padding: 0 var(--space-4);
  border: none;
  border-radius: var(--radius-lg);
  background: var(--status-warning-dim);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--status-warning);
  text-align: left;
  cursor: pointer;
}

.budgets { grid-area: budgets; gap: var(--space-3); }
.wealth { grid-area: wealth; gap: var(--space-3); }

.budget-list,
.account-list,
.adjust-list,
.sub-list {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.budget-list { gap: var(--space-4); }

.budget-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.budget-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.budget-name { font-weight: 500; }

.budget-amounts {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.budget-amounts > span { color: var(--text-primary); font-weight: 600; }
.budget-amounts > .amount--over { color: var(--status-error); }

.gauge {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--bg-overlay);
}

.gauge-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--status-success);
}

.gauge-fill--moyen { background: var(--status-warning); }
.gauge-fill--rate  { background: var(--status-error); }

.adjust-list { gap: var(--space-2); }

.adjust-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px 44px;
  align-items: center;
  gap: var(--space-2);
}

.add-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-2);
}

.adjust-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.wealth-total {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.pill {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background: var(--module-finance-dim);
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--module-finance);
}

.pill--down {
  background: var(--status-warning-dim);
  color: var(--status-warning);
}

.account-list { gap: var(--space-2); }

.account-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.account-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* ── Dépenses sur 6 mois ── */
.history { grid-area: history; gap: var(--space-3); }

.bars {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.bar-track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 150px;
}

.bar {
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  width: 100%;
  max-width: 44px;
}

.bar-seg {
  flex-basis: 0;
  min-height: 4px;
  border-radius: 4px;
}

.bar-col--current .bar { opacity: 0.55; }

.bar-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}

.bar-col--current .bar-label { color: var(--text-primary); font-weight: 600; }

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  list-style: none;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  font-weight: 500;
}

.legend-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
}

.compare {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.compare-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}

.compare-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.compare-delta {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.compare-delta--up   { color: var(--status-error); }
.compare-delta--down { color: var(--status-success); }

/* ── Champs ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.field-input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-overlay);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  color: var(--text-primary);
  outline: none;
}

.field-input:focus { border-color: var(--accent); }
.field-input::placeholder { color: var(--text-secondary); }

.euro-field { position: relative; min-width: 0; }
.field-input--amount { padding-right: 32px; text-align: right; font-variant-numeric: tabular-nums; }

.euro-suffix {
  position: absolute;
  top: 50%;
  right: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  pointer-events: none;
  transform: translateY(-50%);
}

/* ── Import ── */
.import-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.import-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.dropzone {
  align-items: flex-start;
  gap: var(--space-3);
  border: 2px dashed var(--border-default);
  transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.dropzone--over {
  border-color: var(--module-finance);
  background: var(--module-finance-dim);
}

.file-btn { position: relative; overflow: hidden; }
.file-btn--busy { opacity: 0.5; }

.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.file-btn:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }

.preview,
.summary { gap: var(--space-3); }

.facts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}

.facts li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.facts li > :first-child { color: var(--text-secondary); }
.facts li > :last-child { font-weight: 600; text-align: right; }

.warnings {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--status-warning-dim);
  list-style: none;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--status-warning);
}

.dots {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}

.dot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.dot::before {
  content: '';
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--text-secondary);
}

.dot--good::before    { background: var(--status-success); }
.dot--warn::before    { background: var(--status-warning); }
.dot--finance::before { background: var(--module-finance); }

.review { gap: var(--space-3); }

.review-list {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  border-top: 1px solid var(--border-subtle);
}

.review-item:first-child { padding-top: 0; border-top: none; }

.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.review-text { min-width: 0; }

.review-label {
  font-size: var(--text-sm);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.review-amount {
  flex-shrink: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.choice {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.choice--wide {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice--on {
  border-color: var(--action);
  background: var(--action);
  color: var(--on-action);
}

.select-wrap { position: relative; }

.choice--select {
  padding-right: 14px;
  appearance: none;
}

.review-foot {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-3);
}

.remember {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  cursor: pointer;
}

.remember-text {
  min-width: 0;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

/* ── Interrupteur ── */
.switch {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.switch input {
  position: absolute;
  inset: -6px 0;
  width: 100%;
  height: calc(100% + 12px);
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.switch-track {
  display: flex;
  align-items: center;
  width: 52px;
  height: 32px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  background: var(--bg-muted);
  transition: background var(--dur-fast) var(--ease-out);
}

.switch-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--on-rail);
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur-fast) var(--ease-out);
}

.switch input:checked + .switch-track { background: var(--module-finance); }
.switch input:checked + .switch-track .switch-thumb { transform: translateX(20px); }
.switch input:focus-visible + .switch-track { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── Patrimoine et abonnements ── */
.wealth-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "chart"
    "gains"
    "values"
    "note";
  gap: var(--space-3);
}

.chart-card { grid-area: chart; }
.gains { grid-area: gains; gap: var(--space-3); }
.values { grid-area: values; gap: var(--space-3); }
.disclaimer {
  grid-area: note;
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
  text-align: center;
}

.chart {
  width: 100%;
  height: 140px;
  margin-top: var(--space-2);
}

.chart-area { fill: var(--module-finance-dim); }

.chart-line {
  fill: none;
  stroke: var(--module-finance);
  stroke-width: 2.5;
  stroke-linecap: round;
}

.chart-months {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--text-secondary);
}

.gain-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  list-style: none;
}

.gain-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.gain-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
}

.gain-text { min-width: 0; }

.gain-figures {
  display: flex;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.gain--up   { color: var(--status-success); }
.gain--down { color: var(--status-error); }

.values-table {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Mobile : nom sur toute la largeur, les deux champs côte à côte */
.values-head,
.values-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.values-head {
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--text-secondary);
}

.values-head > span:not(.values-head-spacer) { text-align: right; padding-right: var(--space-3); }
.values-head-spacer { display: none; }
.values-name { grid-column: 1 / -1; min-width: 0; }

.add-account {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sub-new {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--module-finance-dim);
}

.sub-new-actions {
  display: flex;
  gap: var(--space-2);
}

.sub-new-actions .btn { flex: 1; }

.sub-list { gap: var(--space-3); }

.sub-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.sub-text { min-width: 0; }

.sub-name {
  font-size: var(--text-sm);
  font-weight: 600;
}

.sub-amount {
  flex-shrink: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sub-up {
  font-size: var(--text-2xs);
  font-weight: 500;
  color: var(--status-warning);
}

/* ── Abonnements ── */
.subs-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
}

.subs-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cal-title { text-align: center; }

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.cal-weekday {
  padding: var(--space-1) 0;
  font-size: var(--text-2xs);
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  min-width: 0;
  min-height: 52px;
  padding: 4px 2px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  font-family: var(--font-sans);
  color: var(--text-primary);
}

.cal-cell--empty { min-height: 0; }

.cal-cell--subs {
  background: var(--bg-overlay);
  cursor: pointer;
}

.cal-cell--subs:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cal-cell--past { opacity: 0.45; }
.cal-cell--today { box-shadow: inset 0 0 0 1.5px var(--text-primary); }

.cal-num {
  font-size: var(--text-2xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cal-logos {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Logos qui se chevauchent un peu pour tenir dans la case */
.cal-logos > * + * { margin-left: -6px; }

.cal-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 3px;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  font-size: var(--text-2xs);
  font-weight: 700;
  color: var(--text-primary);
}

.upcoming { gap: var(--space-3); }
.upcoming .sub-list { gap: var(--space-1); }

.upcoming-total {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.upcoming-total strong {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--module-finance);
  font-variant-numeric: tabular-nums;
}

.sub-row {
  align-items: center;
  margin: 0 calc(-1 * var(--space-2));
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--dur-fast) var(--ease-out);
}

.sub-row .sub-text { flex: 1; }
.sub-row--focus { background: var(--module-finance-dim); }

.debited {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.debited-value {
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.sub-new-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.sub-new-text { min-width: 0; }

/* ── Squelettes ── */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.skeleton {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-muted) 50%, var(--bg-overlay) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

.skeleton--chip  { width: 140px; height: 26px; border-radius: var(--radius-pill); }
.skeleton--title { width: 50%; height: 32px; }
.skeleton--body  { width: 60%; height: 16px; }
.skeleton--value { width: 96px; height: 28px; }

@media (min-width: 768px) {
  .view-head {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .view-break { display: none; }

  .view-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .view-head .head-import { display: inline-flex; }
  .banner .banner-import { display: none; }

  .tabs { align-self: flex-start; min-width: 420px; }
  .banner { padding: var(--space-6) 28px; }
  .card { padding: 20px; }
  .notice--toast { bottom: var(--space-6); }

  .review-foot {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .sub-new {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .sub-new-actions .btn { flex: none; }

  .values-head,
  .values-row {
    grid-template-columns: minmax(0, 1fr) 140px 140px;
    align-items: center;
  }

  .values-head-spacer { display: block; }
  .values-name { grid-column: auto; }

  .bars { gap: var(--space-4); }
  .bar-track { height: 180px; }
}

@media (min-width: 1100px) {
  .finance-view { gap: var(--space-4); }

  .month-grid {
    grid-template-columns: minmax(0, 1fr) 420px;
    grid-template-areas:
      "banner  side"
      "budgets wealth"
      "history wealth";
    align-items: start;
    gap: var(--space-4);
  }

  .month-grid > .banner { min-height: 260px; align-self: stretch; }
  .side { gap: var(--space-4); }
  .tiles { gap: var(--space-4); }
  .tile { padding: var(--space-6); }
  .tile-value { font-size: var(--text-2xl); }

  .banner-title { font-size: var(--text-3xl); max-width: 60%; }
  .orb--a { top: -50px; right: 80px; width: 220px; height: 220px; }
  .orb--b { top: 120px; right: 10px; width: 110px; height: 110px; }

  .card-title { font-size: var(--text-xl); }
  .budgets, .wealth, .history { padding: var(--space-6); }
  .bar-track { height: 200px; }

  .import-grid {
    grid-template-columns: 420px minmax(0, 1fr);
    align-items: start;
    gap: var(--space-4);
  }

  .import-side { gap: var(--space-4); }
  .review { padding: var(--space-6); }

  .wealth-grid {
    grid-template-columns: minmax(0, 1fr) 420px;
    grid-template-areas:
      "chart  values"
      "gains  values"
      "note   note";
    align-items: start;
    gap: var(--space-4);
  }

  .chart-card, .values, .gains { padding: var(--space-6); }
  .chart { height: 220px; }

  .subs-grid {
    grid-template-columns: minmax(0, 1fr) 420px;
    align-items: start;
    gap: var(--space-4);
  }

  .subs-side { gap: var(--space-4); }
  .calendar, .upcoming { padding: var(--space-6); }
  .cal-grid { gap: 6px; }
  .cal-cell { min-height: 76px; padding: 6px 4px; gap: 6px; }
  .cal-num { font-size: var(--text-xs); }
  .cal-logos > * + * { margin-left: -4px; }
  .cal-more { min-width: 28px; height: 28px; }
}
</style>
