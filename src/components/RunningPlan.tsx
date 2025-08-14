import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock, MapPin, Zap, Heart, Trophy, Award, Target } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import plan10kJson from '../treinos/10k.json';
import plan5kSub25Json from '../treinos/5k-sub-25.json';

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

const USERNAME_STORAGE_KEY = 'running_plan_username';
const PLAN_STORAGE_KEY = 'running_plan_selected_plan';

type WorkoutJson = {
  day: string;
  type: string;
  duration?: string;
  description: string;
  icon?: string;
  hr?: string;
  hrColor?: string;
};

type WeekJson = {
  week: number;
  phase: string;
  color: string;
  focus: string;
  workouts: WorkoutJson[];
};

type PlanJson = {
  treino: WeekJson[];
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  MapPin,
  Zap,
  Clock,
  Target,
  Trophy,
  Award,
};

const convertPlanJsonToWeeks = (plan: PlanJson): Week[] => {
  return (plan?.treino || []).map((w) => ({
    week: w.week,
    phase: w.phase,
    color: w.color,
    focus: w.focus,
    workouts: (w.workouts || []).map((wo) => ({
      day: wo.day,
      type: wo.type,
      duration: wo.duration,
      description: wo.description,
      icon: wo.icon && iconMap[wo.icon] ? iconMap[wo.icon] : Heart,
      hr: wo.hr,
      hrColor: wo.hrColor,
    })),
  }));
};

const plans: Record<string, { id: string; name: string; description: string; data: PlanJson }> = {
  '10k': {
    id: '10k',
    name: 'Plano 10K',
    description: '16 semanas para correr 10km confortavelmente',
    data: plan10kJson as PlanJson,
  },
  '5k-sub-25': {
    id: '5k-sub-25',
    name: 'Plano 5K Sub-25',
    description: '16 semanas para correr 5km abaixo de 25min',
    data: plan5kSub25Json as PlanJson,
  },
};

const useUsername = (): [string, (username: string) => void] => {
  const [username, setUsername] = useState<string>('');
  
  useEffect(() => {
    const saved = localStorage.getItem(USERNAME_STORAGE_KEY);
    if (saved) {
      setUsername(saved);
    }
  }, []);
  
  const saveUsername = (newUsername: string) => {
    setUsername(newUsername);
    localStorage.setItem(USERNAME_STORAGE_KEY, newUsername);
  };
  
  return [username, saveUsername];
};

const useSelectedPlanId = (): [string, (planId: string) => void] => {
  const [planId, setPlanId] = useState<string>('10k');
  useEffect(() => {
    const saved = localStorage.getItem(PLAN_STORAGE_KEY);
    if (saved && plans[saved]) {
      setPlanId(saved);
    }
  }, []);
  const savePlanId = (newPlanId: string) => {
    setPlanId(newPlanId);
    localStorage.setItem(PLAN_STORAGE_KEY, newPlanId);
  };
  return [planId, savePlanId];
};

const RunningPlan: React.FC = () => {
  const [completedWeeks, setCompletedWeeks] = useState<Set<number>>(new Set());
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useUsername();
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [showUsernameForm, setShowUsernameForm] = useState<boolean>(true);
  const [selectedPlanId, setSelectedPlanId] = useSelectedPlanId();

  const weeks: Week[] = useMemo(() => convertPlanJsonToWeeks(plans[selectedPlanId].data), [selectedPlanId]);

  useEffect(() => {
    const load = async () => {
      if (!username) return;
      setLoading(true);
      try {
        const ref = doc(db, 'running_progress', `${username}_${selectedPlanId}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as { completedWeeks?: number[]; completedWorkouts?: string[] };
          setCompletedWeeks(new Set<number>(data.completedWeeks || []));
          setCompletedWorkouts(new Set<string>(data.completedWorkouts || []));
        } else {
          setCompletedWeeks(new Set());
          setCompletedWorkouts(new Set());
        }
      } catch (err) {
        // offline fallback
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, selectedPlanId]);

  const save = async (weeksSet: Set<number>, workoutsSet: Set<string>) => {
    try {
      if (!username) return;
      const ref = doc(db, 'running_progress', `${username}_${selectedPlanId}`);
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
  const progressPercentage = totalWorkouts > 0 ? Math.round((completedWorkoutsCount / totalWorkouts) * 100) : 0;
  const nextWeek = weeks.find((week) => week.workouts.some((_, index) => !completedWorkouts.has(`${week.week}-${index}`)));

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      const cleanUsername = usernameInput.startsWith('@') ? usernameInput.slice(1) : usernameInput;
      if (cleanUsername.trim()) {
        setUsername(cleanUsername.trim());
        setShowUsernameForm(false);
      }
    }
  };
  
  const handleChangeUser = () => {
    localStorage.removeItem(USERNAME_STORAGE_KEY);
    setUsername('');
    setUsernameInput('');
    setShowUsernameForm(true);
  };

  useEffect(() => {
    if (username && showUsernameForm) {
      setShowUsernameForm(false);
    } else if (!username && !showUsernameForm) {
      setShowUsernameForm(true);
    }
  }, [username, showUsernameForm]);
  
  if (showUsernameForm) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg mt-20">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🏃‍♂️ Plano 10K</h1>
          <p className="text-gray-600">Digite seu nome de usuário para carregar seu progresso</p>
        </div>
        <form onSubmit={handleUsernameSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Nome de usuário
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
              <input
                type="text"
                id="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="seu_nome_usuario"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Carregar Progresso
          </button>
        </form>
      </div>
    );
  }

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
    <>
      <div className="max-w-5xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="text-center mb-8">
        <div className="flex flex-col items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold text-gray-800">🏃‍♂️ {plans[selectedPlanId].name}</h1>
          <p className="text-lg text-gray-600">{plans[selectedPlanId].description}</p>
          <div className="flex items-center gap-2">
            {Object.values(plans).map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors ${selectedPlanId === plan.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}
                title={plan.name}
              >
                {plan.name}
              </button>
            ))}
          </div>
          <p className="text-sm text-blue-600 font-medium">Progresso salvo por usuário e por plano</p>
        </div>

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
            {nextWeek ? `Semana ${nextWeek.week} - ${nextWeek.focus}` : 'Objetivo final concluído! 🎯'}
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
      
      {/* Change User Button at page end */}
      <div className="mt-10 flex justify-center">
        <button
          onClick={handleChangeUser}
          className="bg-white text-blue-600 border border-blue-300 px-4 py-2 rounded-lg shadow hover:bg-blue-50 hover:border-blue-400 transition-colors text-sm font-medium"
          title={`Usuário atual: @${username}`}
        >
          Trocar usuário
        </button>
      </div>
    </div>
    </>
  );
};

export default RunningPlan;


