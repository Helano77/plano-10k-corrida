import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, MapPin, Zap, Heart, Trophy, Award, Target } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

type Workout = {
  day: string;
  type: string;
  duration?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  hr?: string;
  hrColor?: string;
};

type Week = {
  week: number;
  phase: string;
  color: string;
  focus: string;
  workouts: Workout[];
};

const USER_ID_STORAGE_KEY = 'running_plan_user_id_v1';

const useUserId = (): string => {
  const [userId, setUserId] = useState<string>('');
  useEffect(() => {
    const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existing) {
      setUserId(existing);
      return;
    }
    const generated = `user_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(USER_ID_STORAGE_KEY, generated);
    setUserId(generated);
  }, []);
  return userId;
};

const RunningPlan: React.FC = () => {
  const [completedWeeks, setCompletedWeeks] = useState<Set<number>>(new Set());
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const userId = useUserId();

  const weeks: Week[] = useMemo(() => [
    {
      week: 1,
      phase: 'Base Aeróbica (Ritmo Conversacional)',
      color: 'bg-blue-50 border-blue-200',
      focus: 'Desenvolver base sem forçar o ritmo',
      workouts: [
        { day: 'Seg', type: 'Caminhada Rápida', duration: '25min', description: 'Ritmo acelerado mas confortável + alongamento panturrilha', icon: Heart, hr: 'Zona 1 (120-138)', hrColor: 'text-gray-600' },
        { day: 'Qua', type: 'Trote Suave', duration: '20min', description: '10min caminhada + 5min trote BEM leve + 5min caminhada', icon: MapPin, hr: 'Zona 1-2 (120-150)', hrColor: 'text-gray-600' },
        { day: 'Sex', type: 'Caminhada + Força', duration: '30min', description: '20min caminhada + 10min exercícios para panturrilha/core', icon: Zap, hr: 'Zona 1 (120-138)', hrColor: 'text-gray-600' },
        { day: 'Dom', type: 'Atividade Livre', duration: '30-45min', description: 'Caminhada, bike ou natação - o que preferir', icon: Clock, hr: 'Zona 1 (120-138)', hrColor: 'text-gray-600' },
      ],
    },
    {
      week: 2,
      phase: 'Base Aeróbica (Ritmo Conversacional)',
      color: 'bg-blue-50 border-blue-200',
      focus: 'Aumentar tempo de trote sem pressa',
      workouts: [
        { day: 'Seg', type: 'Caminhada Ativa', duration: '30min', description: 'Ritmo firme + alongamento completo', icon: Heart, hr: 'Zona 1 (120-138)', hrColor: 'text-gray-600' },
        { day: 'Qua', type: 'Trote Intervalado', duration: '25min', description: '5min aquecimento + 6x(2min trote + 2min caminhada) + 5min volta à calma', icon: MapPin, hr: 'Zona 2 (138-157)', hrColor: 'text-green-600' },
        { day: 'Sex', type: 'Fortalecimento', duration: '25min', description: '10min caminhada + 15min exercícios específicos para corrida', icon: Zap, hr: 'Zona 1 (120-138)', hrColor: 'text-gray-600' },
        { day: 'Dom', type: 'Endurance Misto', duration: '35min', description: 'Alternando 5min caminhada rápida + 3min trote leve', icon: Clock, hr: 'Zona 1-2 (120-150)', hrColor: 'text-gray-600' },
      ],
    },
    {
      week: 3,
      phase: 'Base Aeróbica (Ritmo Conversacional)',
      color: 'bg-blue-50 border-blue-200',
      focus: 'Primeiro trote contínuo de 10 minutos',
      workouts: [
        { day: 'Seg', type: 'Recuperação Ativa', duration: '25min', description: 'Caminhada leve + mobilidade articular', icon: Heart, hr: 'Zona 1 (120-138)', hrColor: 'text-gray-600' },
        { day: 'Qua', type: 'Trote Contínuo', duration: '30min', description: '10min aquecimento + 10min trote contínuo + 10min caminhada', icon: Target, hr: 'Zona 2 (138-157)', hrColor: 'text-green-600' },
        { day: 'Sex', type: 'Força + Mobilidade', duration: '30min', description: 'Exercícios funcionais + alongamento profundo', icon: Zap, hr: 'Zona 1 (120-138)', hrColor: 'text-gray-600' },
        { day: 'Dom', type: 'Volume Baixo', duration: '40min', description: 'Alternando 3min trote + 2min caminhada por todo tempo', icon: Clock, hr: 'Zona 2 (138-157)', hrColor: 'text-green-600' },
      ],
    },
    {
      week: 4,
      phase: 'Base Aeróbica (Ritmo Conversacional)',
      color: 'bg-blue-50 border-blue-200',
      focus: 'Consolidar 15min de trote contínuo',
      workouts: [
        { day: 'Seg', type: 'Easy Recovery', duration: '25min', description: 'Caminhada regenerativa + exercícios leves', icon: Heart },
        { day: 'Qua', type: 'Trote Base', duration: '35min', description: '10min aquecimento + 15min trote contínuo + 10min volta à calma', icon: Target },
        { day: 'Sex', type: 'Cross Training', duration: '30min', description: 'Fortalecimento geral + core stability', icon: Zap },
        { day: 'Dom', type: 'Long Easy', duration: '45min', description: 'Ritmo bem confortável, alternando conforme necessário', icon: Clock },
      ],
    },
    {
      week: 5,
      phase: 'Construção de Base',
      color: 'bg-green-50 border-green-200',
      focus: '20min de trote contínuo - marco importante!',
      workouts: [
        { day: 'Seg', type: 'Recovery', duration: '30min', description: 'Caminhada + alongamento específico', icon: Heart },
        { day: 'Qua', type: 'Milestone Run', duration: '40min', description: '10min aquecimento + 20min trote contínuo + 10min caminhada', icon: Award },
        { day: 'Sex', type: 'Strength', duration: '35min', description: 'Trabalho de força para corredores', icon: Zap },
        { day: 'Dom', type: 'Endurance Build', duration: '50min', description: 'Volume maior em ritmo bem confortável', icon: Clock },
      ],
    },
    {
      week: 6,
      phase: 'Construção de Base',
      color: 'bg-green-50 border-green-200',
      focus: 'Aumentar confiança nos 25min contínuos',
      workouts: [
        { day: 'Seg', type: 'Active Recovery', duration: '30min', description: 'Movimento suave + mobilidade', icon: Heart },
        { day: 'Qua', type: 'Steady Run', duration: '45min', description: '10min aquecimento + 25min trote + 10min volta à calma', icon: Target },
        { day: 'Sex', type: 'Functional', duration: '35min', description: 'Exercícios específicos + prevenção', icon: Zap },
        { day: 'Dom', type: 'Long Base', duration: '55min', description: 'Construindo resistência em ritmo conversacional', icon: Clock },
      ],
    },
    {
      week: 7,
      phase: 'Construção de Base',
      color: 'bg-green-50 border-green-200',
      focus: '30min contínuos - você está evoluindo!',
      workouts: [
        { day: 'Seg', type: 'Easy Day', duration: '30min', description: 'Regeneração completa', icon: Heart },
        { day: 'Qua', type: 'Base Run', duration: '50min', description: '10min aquecimento + 30min trote + 10min volta à calma', icon: Award },
        { day: 'Sex', type: 'Strength', duration: '35min', description: 'Manter força específica', icon: Zap },
        { day: 'Dom', type: 'Volume Day', duration: '60min', description: 'Maior volume da semana em ritmo fácil', icon: Clock },
      ],
    },
    {
      week: 8,
      phase: 'Construção de Base',
      color: 'bg-green-50 border-green-200',
      focus: 'Consolidar base - 35min sem parar',
      workouts: [
        { day: 'Seg', type: 'Recovery', duration: '30min', description: 'Foco na recuperação', icon: Heart },
        { day: 'Qua', type: 'Solid Base', duration: '55min', description: '10min aquecimento + 35min trote + 10min volta à calma', icon: Target },
        { day: 'Sex', type: 'Cross + Core', duration: '35min', description: 'Trabalho complementar', icon: Zap },
        { day: 'Dom', type: 'Long Easy', duration: '65min', description: 'Volume em ritmo muito confortável', icon: Clock },
      ],
    },
    {
      week: 9,
      phase: 'Desenvolvimento de Resistência',
      color: 'bg-yellow-50 border-yellow-200',
      focus: 'Primeiro teste de 5K contínuo',
      workouts: [
        { day: 'Seg', type: 'Easy', duration: '30min', description: 'Preparação para teste', icon: Heart },
        { day: 'Qua', type: 'Teste 5K', duration: '50min', description: 'Aquecimento + 5K em ritmo confortável + volta à calma', icon: Trophy },
        { day: 'Sex', type: 'Recovery', duration: '25min', description: 'Regeneração pós-teste', icon: MapPin },
        { day: 'Dom', type: 'Long Run', duration: '60min', description: 'Volume longo em ritmo bem fácil', icon: Clock },
      ],
    },
    {
      week: 10,
      phase: 'Desenvolvimento de Resistência',
      color: 'bg-yellow-50 border-yellow-200',
      focus: 'Trabalhar variações de ritmo suaves',
      workouts: [
        { day: 'Seg', type: 'Base Run', duration: '35min', description: 'Trote base confortável', icon: Heart },
        { day: 'Qua', type: 'Fartlek Suave', duration: '45min', description: 'Aquecimento + 25min variando entre confortável e moderado + volta à calma', icon: Zap },
        { day: 'Sex', type: 'Easy', duration: '30min', description: 'Recuperação ativa', icon: MapPin },
        { day: 'Dom', type: 'Progressive', duration: '65min', description: 'Começar fácil e terminar em ritmo moderado', icon: Clock },
      ],
    },
    {
      week: 11,
      phase: 'Desenvolvimento de Resistência',
      color: 'bg-yellow-50 border-yellow-200',
      focus: 'Aumentar tempo total de corrida',
      workouts: [
        { day: 'Seg', type: 'Recovery', duration: '30min', description: 'Trote regenerativo', icon: Heart },
        { day: 'Qua', type: 'Tempo Moderado', duration: '50min', description: 'Aquecimento + 25min em ritmo moderadamente firme + volta à calma', icon: Target },
        { day: 'Sex', type: 'Easy', duration: '35min', description: 'Manter volume fácil', icon: MapPin },
        { day: 'Dom', type: 'Long Steady', duration: '70min', description: 'Seu maior volume até aqui', icon: Clock },
      ],
    },
    {
      week: 12,
      phase: 'Desenvolvimento de Resistência',
      color: 'bg-yellow-50 border-yellow-200',
      focus: 'Teste de 7K - você está quase lá!',
      workouts: [
        { day: 'Seg', type: 'Easy', duration: '35min', description: 'Preparação tranquila', icon: Heart },
        { day: 'Qua', type: 'Teste 7K', duration: '60min', description: 'Aquecimento + 7K contínuo + volta à calma', icon: Trophy },
        { day: 'Sex', type: 'Recovery', duration: '30min', description: 'Regeneração pós-teste', icon: MapPin },
        { day: 'Dom', type: 'Volume', duration: '65min', description: 'Manter volume em ritmo fácil', icon: Clock },
      ],
    },
    {
      week: 13,
      phase: 'Preparação Específica',
      color: 'bg-orange-50 border-orange-200',
      focus: 'Trabalho específico para 10K',
      workouts: [
        { day: 'Seg', type: 'Base', duration: '40min', description: 'Trote base sólido', icon: Heart },
        { day: 'Qua', type: 'Ritmo 10K', duration: '55min', description: 'Aquecimento + 4x(2K ritmo objetivo + 2min fácil) + volta à calma', icon: Target },
        { day: 'Sex', type: 'Easy', duration: '30min', description: 'Recuperação entre treinos duros', icon: MapPin },
        { day: 'Dom', type: 'Long Run', duration: '75min', description: 'Volume maior para consolidar resistência', icon: Clock },
      ],
    },
    {
      week: 14,
      phase: 'Preparação Específica',
      color: 'bg-orange-50 border-orange-200',
      focus: 'Simulado de 8-9K',
      workouts: [
        { day: 'Seg', type: 'Easy', duration: '35min', description: 'Preparação para simulado', icon: Heart },
        { day: 'Qua', type: 'Simulado 8K', duration: '60min', description: 'Aquecimento + 8K no ritmo que pretende fazer os 10K + volta à calma', icon: Award },
        { day: 'Sex', type: 'Recovery', duration: '25min', description: 'Regeneração leve', icon: MapPin },
        { day: 'Dom', type: 'Endurance', duration: '70min', description: 'Volume confortável', icon: Clock },
      ],
    },
    {
      week: 15,
      phase: 'Polimento Final',
      color: 'bg-purple-50 border-purple-200',
      focus: 'Ajustes finais e confiança',
      workouts: [
        { day: 'Seg', type: 'Easy Run', duration: '35min', description: 'Manter ritmo e forma', icon: Heart },
        { day: 'Qua', type: 'Sharpening', duration: '45min', description: 'Aquecimento + 3x(1K ritmo 10K + 2min recuperação) + volta à calma', icon: Zap },
        { day: 'Sex', type: 'Easy', duration: '30min', description: 'Trote leve', icon: MapPin },
        { day: 'Dom', type: 'Test Run', duration: '65min', description: 'Teste final de 9K ou volume equivalente', icon: Target },
      ],
    },
    {
      week: 16,
      phase: 'Semana da Prova! 🎯',
      color: 'bg-gradient-to-r from-yellow-50 to-gold-100 border-yellow-300',
      focus: 'SEMANA DOS 10K - VOCÊ CONSEGUIU!',
      workouts: [
        { day: 'Seg', type: 'Easy', duration: '25min', description: 'Trote bem leve para manter ativo', icon: Heart },
        { day: 'Qua', type: 'Activation', duration: '20min', description: '15min fácil + 3x100m em ritmo moderado', icon: Zap },
        { day: 'Sex', type: 'Descanso', duration: '-', description: 'Descanso completo ou caminhada leve', icon: MapPin },
        { day: 'Dom', type: '🏆 PROVA 10K!', duration: '80min', description: 'Aquecimento + SEUS 10K + comemoração merecida!', icon: Trophy },
      ],
    },
  ], []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const ref = doc(db, 'running_progress', userId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as { completedWeeks?: number[]; completedWorkouts?: string[] };
          if (data.completedWeeks) setCompletedWeeks(new Set<number>(data.completedWeeks));
          if (data.completedWorkouts) setCompletedWorkouts(new Set<string>(data.completedWorkouts));
        }
      } catch (err) {
        // offline fallback
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const save = async (weeksSet: Set<number>, workoutsSet: Set<string>) => {
    try {
      if (!userId) return;
      const ref = doc(db, 'running_progress', userId);
      await setDoc(ref, {
        completedWeeks: Array.from(weeksSet),
        completedWorkouts: Array.from(workoutsSet),
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch {
      // ignore
    }
  };

  const toggleWeek = (weekId: number) => {
    const next = new Set(completedWeeks);
    next.has(weekId) ? next.delete(weekId) : next.add(weekId);
    setCompletedWeeks(next);
    save(next, completedWorkouts);
  };

  const toggleWorkout = (workoutId: string) => {
    const next = new Set(completedWorkouts);
    next.has(workoutId) ? next.delete(workoutId) : next.add(workoutId);
    setCompletedWorkouts(next);
    save(completedWeeks, next);
  };

  const totalWorkouts = weeks.reduce((sum, week) => sum + week.workouts.length, 0);
  const completedWorkoutsCount = completedWorkouts.size;
  const progressPercentage = Math.round((completedWorkoutsCount / totalWorkouts) * 100);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando seu progresso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🏃‍♂️ Seu Plano Personalizado 10K</h1>
        <p className="text-lg text-gray-600 mb-2">16 semanas para correr 10km confortavelmente</p>
        <p className="text-sm text-blue-600 font-medium">Adaptado para seu nível atual: 1km contínuo {'\u2192'} 10km confortável</p>

        <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">💓 Suas Zonas de FC (Frequência Cardíaca)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-gray-100 p-2 rounded">
              <div className="font-semibold text-gray-700">Zona 1 - Recovery</div>
              <div className="text-blue-600">120-138 bpm</div>
              <div className="text-gray-500">60-70% FC Máx</div>
            </div>
            <div className="bg-green-100 p-2 rounded">
              <div className="font-semibold text-green-700">Zona 2 - Base</div>
              <div className="text-green-600">138-157 bpm</div>
              <div className="text-gray-500">70-80% FC Máx</div>
            </div>
            <div className="bg-yellow-100 p-2 rounded">
              <div className="font-semibold text-yellow-700">Zona 3 - Tempo</div>
              <div className="text-yellow-600">157-176 bpm</div>
              <div className="text-gray-500">80-90% FC Máx</div>
            </div>
            <div className="bg-orange-100 p-2 rounded">
              <div className="font-semibold text-orange-700">Zona 4 - Limiar</div>
              <div className="text-orange-600">176-186 bpm</div>
              <div className="text-gray-500">90-95% FC Máx</div>
            </div>
            <div className="bg-red-100 p-2 rounded">
              <div className="font-semibold text-red-700">Zona 5 - VO2</div>
              <div className="text-red-600">186-196 bpm</div>
              <div className="text-gray-500">95-100% FC Máx</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">*Calculado para idade estimada de 30 anos. Ajuste: FC Máx = 220 - sua idade</p>
        </div>

        <div className="mt-6 bg-white rounded-xl p-6 shadow-lg">
          <div className="flex justify-center items-center gap-8 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{progressPercentage}%</div>
              <div className="text-sm text-gray-500">Progresso Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{completedWorkoutsCount}</div>
              <div className="text-sm text-gray-500">Treinos Completos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{completedWeeks.size}</div>
              <div className="text-sm text-gray-500">Semanas Completas</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <div className="text-sm text-gray-600">
            <strong>Próximo marco:</strong>{' '}
            {completedWorkoutsCount < 16 ? 'Completar Base Aeróbica (Semanas 1-4)' :
             completedWorkoutsCount < 32 ? 'Construir Resistência (Semanas 5-8)' :
             completedWorkoutsCount < 48 ? 'Desenvolver Endurance (Semanas 9-12)' :
             completedWorkoutsCount < 56 ? 'Preparação Específica (Semanas 13-14)' :
             completedWorkoutsCount < 60 ? 'Polimento Final (Semana 15)' :
             'PROVA DOS 10K! 🎯'}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {weeks.map((week) => {
          const weekCompleted = completedWeeks.has(week.week);
          return (
            <div key={week.week} className={`${week.color} rounded-xl p-6 border-2 shadow-sm`}>
              <div className="flex items-center justify-between cursor-pointer mb-4" onClick={() => toggleWeek(week.week)}>
                <div className="flex items-center gap-3">
                  {weekCompleted ? <CheckCircle2 className="text-green-600 w-6 h-6" /> : <Circle className="text-gray-400 w-6 h-6" />}
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Semana {week.week}</h3>
                    <p className="text-sm text-gray-600 font-medium">{week.focus}</p>
                  </div>
                  <span className={`${week.phase.includes('Base Aeróbica') ? 'bg-blue-100 text-blue-800' :
                    week.phase.includes('Construção') ? 'bg-green-100 text-green-800' :
                    week.phase.includes('Desenvolvimento') ? 'bg-yellow-100 text-yellow-800' :
                    week.phase.includes('Preparação') ? 'bg-orange-100 text-orange-800' :
                    week.phase.includes('Polimento') ? 'bg-purple-100 text-purple-800' :
                    'bg-gradient-to-r from-yellow-200 to-gold-200 text-yellow-900'} px-3 py-1 rounded-full text-sm font-medium`}>
                    {week.phase}
                  </span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {week.workouts.map((workout, index) => {
                  const workoutId = `${week.week}-${index}`;
                  const workoutCompleted = completedWorkouts.has(workoutId);
                  const IconComponent = workout.icon;
                  return (
                    <div key={workoutId} className={`bg-white rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${workoutCompleted ? 'ring-2 ring-green-500 bg-green-50' : ''}`} onClick={() => toggleWorkout(workoutId)}>
                      <div className="flex items-center gap-2 mb-2">
                        {workoutCompleted ? <CheckCircle2 className="text-green-600 w-5 h-5" /> : <Circle className="text-gray-400 w-5 h-5" />}
                        <IconComponent className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-sm text-gray-800">{workout.day}</span>
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-1">{workout.type}</h4>
                      {workout.duration && <p className="text-sm text-blue-600 font-medium mb-1">⏱️ {workout.duration}</p>}
                      {workout.hr && <p className={`text-xs font-medium mb-2 ${workout.hrColor}`}>💓 {workout.hr}</p>}
                      <p className="text-xs text-gray-600 leading-relaxed">{workout.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🎯 Estratégias para Manter Disciplina</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">✅ Regra do "Não Zero"</h4>
              <p className="text-sm text-gray-600">Mesmo nos dias difíceis, faça pelo menos 10min de caminhada. Manter o hábito é mais importante que a intensidade.</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">🏆 Sistema de Marcos</h4>
              <p className="text-sm text-gray-600">Comemore cada conquista: primeiro 1K contínuo, depois 2K, 5K... Cada marco é uma vitória!</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">📱 Acompanhamento Visual</h4>
              <p className="text-sm text-gray-600">Use este plano para marcar progressos. Ver a barra de progresso crescer é motivador!</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">💡 Dicas Específicas para Seu Perfil</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🏃‍♂️ Sobre Ritmo {'&'} Frequência Cardíaca:</h4>
              <ul className="space-y-1">
                <li>• <strong>Zona 1-2:</strong> Você deve conseguir falar frases completas</li>
                <li>• <strong>Zona 3:</strong> Respiração controlada, palavras curtas</li>
                <li>• <strong>Se passar de 180 bpm:</strong> DIMINUA o ritmo imediatamente</li>
                <li>• <strong>80% dos treinos</strong> devem ser em Zona 1-2 (fácil)</li>
                <li>• Use monitor cardíaco ou app no celular para acompanhar</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🦵 Prevenção de Lesões:</h4>
              <ul className="space-y-1">
                <li>• <strong>Panturrilha:</strong> Alongue após CADA treino</li>
                <li>• Fortalecimento específico 2x/semana</li>
                <li>• Gelo por 10min se sentir sobrecarga</li>
                <li>• Tênis adequados para seu peso e pisada</li>
                <li>• <strong>Se FC {'>'} 180 bpm:</strong> risco de lesão aumenta</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 shadow-lg border-2 border-blue-200 mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">💓 Como Usar as Zonas de FC</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-green-700 mb-2">🟢 Zonas 1-2 (Fácil)</h4>
              <p className="text-gray-600 mb-2">120-157 bpm</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Consegue conversar normalmente</li>
                <li>• Respiração controlada</li>
                <li>• Pode manter por muito tempo</li>
                <li>• Base de 80% dos treinos</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-700 mb-2">🟡 Zona 3 (Moderado)</h4>
              <p className="text-gray-600 mb-2">157-176 bpm</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Fala palavras curtas</li>
                <li>• Respiração mais intensa</li>
                <li>• Ritmo "comfortavelmente difícil"</li>
                <li>• Para testes e tempos</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-red-700 mb-2">🔴 Zona 4+ (Intenso)</h4>
              <p className="text-gray-600 mb-2">176+ bpm</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Difícil falar</li>
                <li>• Respiração ofegante</li>
                <li>• Apenas em intervalos curtos</li>
                <li>• ⚠️ Evitar no seu nível atual</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 shadow-lg border-2 border-green-200">
          <h3 className="text-xl font-bold text-gray-800 mb-2">🚀 Sua Jornada de Transformação</h3>
          <div className="text-sm text-gray-700">
            <p className="mb-2"><strong>Hoje:</strong> Corre 1km contínuo, força o ritmo (provavelmente {'>'}180 bpm), fadiga na panturrilha</p>
            <p className="mb-2"><strong>Semana 8:</strong> Correrá 35min contínuos em Zona 2 (138-157 bpm) confortavelmente</p>
            <p><strong>Semana 16:</strong> Completará 10K em Zona 3 (157-176 bpm) com sorriso no rosto! 🎉</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunningPlan;


